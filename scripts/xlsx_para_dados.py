#!/usr/bin/env python3
"""Converte as abas SENADO e CÂMARA da planilha de perfis em data/dados.js.

Uso:
    pip install openpyxl pillow
    python3 scripts/xlsx_para_dados.py caminho/da/planilha.xlsx [--fotos]

--fotos baixa as fotos novas ou trocadas (links do Google Drive públicos) para
assets/fotos/, redimensionadas; para senadores sem foto, tenta a foto oficial na
API de dados abertos do Senado; e apaga fotos de quem saiu da planilha.

Campos internos (Responsável, Revisor) NÃO vão para o site.
Só perfis com Status = "Feito" exportam o conteúdo; os demais entram apenas
com nome/partido/UF e aparecem como "em produção".
"""
import argparse
import io
import json
import os
import re
import ssl
import sys
import unicodedata
import urllib.request
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
PASTA_FOTOS = RAIZ / "assets" / "fotos"
MANIFESTO = PASTA_FOTOS / "_origem.json"

PARTIDOS = {
    "UNIAO BRASIL": "União", "UNIAO": "União", "REPUBLICANOS": "Republicanos",
    "NOVO": "Novo", "REDE": "Rede", "PODE": "Podemos", "PODEMOS": "Podemos",
    "SEM PARTIDO": "Sem partido", "PCDOB": "PCdoB", "AVANTE": "Avante",
    "SOLIDARIEDADE": "Solidariedade", "MISSAO": "Missão",
}
TRACKING = ("utm_", "fbclid", "igsh", "igshid", "hl", "si", "ref", "mibextid")
REDES = {"instagram.com": "Instagram", "linktr.ee": "Linktree", "x.com": "X", "twitter.com": "X",
         "facebook.com": "Facebook", "tiktok.com": "TikTok", "youtube.com": "YouTube",
         "youtu.be": "YouTube", "kwai.com": "Kwai", "threads.net": "Threads"}
REDIRECIONADORES = {"l.instagram.com": "u", "l.facebook.com": "u", "lm.facebook.com": "u",
                    "www.google.com": "q", "google.com": "q"}
PARTICULAS = {"de", "da", "do", "das", "dos", "e", "o", "a"}

# índice das colunas em cada aba (0 = primeira coluna)
SENADO = dict(status=1, nome=3, partido=4, uf=5, situacao=6, naturalidade=7, formacao=8, ocupacao=9,
              cargos=10, areas=11, redes=12, foto=13, minibio=14, pagina=15, fontes=16, revisao=17)
CAMARA = dict(status=1, nome=3, partido=4, uf=5, situacao=6, naturalidade=7, formacao=8, ocupacao=None,
              cargos=None, areas=9, redes=10, foto=11, minibio=13, pagina=14, fontes=15, revisao=16)


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", sem_acento(s).lower()).strip("-")


def texto(v):
    return re.sub(r"[ \t]+", " ", str(v)).strip() if v is not None else ""


def nome_proprio(v):
    """'SOCORRO NERI' -> 'Socorro Neri'; mantém nomes que já vêm bem escritos."""
    t = texto(v)
    if t != t.upper():
        return t
    palavras = []
    for i, w in enumerate(t.lower().split(" ")):
        palavras.append(w if (i and w in PARTICULAS) else w[:1].upper() + w[1:])
    return " ".join(palavras)


def partido(v):
    t = texto(v)
    return PARTIDOS.get(sem_acento(t).upper(), t)


def situacao(v):
    t = texto(v)
    if t.lower().startswith("eleito em 2022"):
        return "Eleito em 2022"
    return {"Novata": "Novato"}.get(t, t)


def limpar_url(u):
    p = urlsplit(u.strip().rstrip(".,;)"))
    alvo = REDIRECIONADORES.get(p.netloc.lower())
    if alvo:  # desembrulha links de redirecionamento
        interno = dict(parse_qsl(p.query)).get(alvo)
        if interno:
            return limpar_url(interno)
    if p.scheme not in ("http", "https") or not p.netloc:
        return None
    q = [(k, v) for k, v in parse_qsl(p.query) if not k.startswith(TRACKING)]
    return urlunsplit((p.scheme, p.netloc, p.path, urlencode(q), ""))


def urls(v):
    achadas = re.findall(r"https?://.*?(?=https?://|[\s\"'<>]|$)", texto(v))
    saida = []
    for u in map(limpar_url, achadas):
        if u and u not in saida:
            saida.append(u)
    return saida


def rotulo_rede(u):
    host = urlsplit(u).netloc.lower().removeprefix("www.")
    return REDES.get(host, host)


def areas(v):
    saida = []
    for a in re.findall(r'"[^"]*"|[^,]+', texto(v)):
        a = a.strip().strip('"').strip().lower()
        if not a:
            continue
        a = re.sub(r"lgbtqia\+?", "LGBTQIA+", a[:1].upper() + a[1:], flags=re.I)
        if a not in saida:
            saida.append(a)
    return saida


def id_drive(u):
    m = re.search(r"/d/([\w-]+)", u or "") or re.search(r"[?&]id=([\w-]+)", u or "")
    return m.group(1) if m else None


def baixar_bytes(url):
    ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "*/*"})
    return urllib.request.urlopen(req, timeout=40, context=ctx).read()


def salvar_foto(url, destino):
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(baixar_bytes(url))).convert("RGB")
        img.thumbnail((400, 500))
        destino.parent.mkdir(parents=True, exist_ok=True)
        img.save(destino, "JPEG", quality=82, optimize=True)
        return True
    except Exception as e:  # noqa: BLE001
        print(f"  ! foto falhou ({destino.name}): {e}", file=sys.stderr)
        return False


def baixar_foto(fid, destino):
    return salvar_foto(f"https://drive.google.com/thumbnail?id={fid}&sz=w600", destino)


def norm(s):
    return re.sub(r"[^a-z0-9 ]", "", sem_acento(s).lower()).strip()


def indice_api_senado():
    """Parlamentares da legislatura atual e da próxima, pela API de dados abertos do Senado."""
    idx = []
    for url, chave in (("https://legis.senado.leg.br/dadosabertos/senador/lista/atual", "ListaParlamentarEmExercicio"),
                       ("https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/58", "ListaParlamentarLegislatura")):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
            ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
            dados = json.loads(urllib.request.urlopen(req, timeout=60, context=ctx).read())
            idx += [p["IdentificacaoParlamentar"] for p in dados[chave]["Parlamentares"]["Parlamentar"]]
        except Exception as e:  # noqa: BLE001
            print(f"  ! API do Senado indisponível ({url}): {e}", file=sys.stderr)
    return idx


def achar_na_api(nome, idx):
    n = norm(nome)
    exatos = [i for i in idx if n in (norm(i["NomeParlamentar"]), norm(i["NomeCompletoParlamentar"]))]
    if not exatos:  # todas as palavras do nome aparecem no nome da API (ex.: "Professora Dorinha")
        palavras = set(n.split())
        exatos = [i for i in idx if palavras <= set(norm(i["NomeParlamentar"]).split())]
    return exatos[0] if len({i["CodigoParlamentar"] for i in exatos}) == 1 else None


def fotos_do_senado(perfis, manifesto):
    """Para senadores sem foto local, tenta a foto oficial na API do Senado."""
    faltam = [p for p in perfis if p["casa"] == "Senado Federal" and not (PASTA_FOTOS / f"{p['id']}.jpg").exists()]
    if not faltam:
        return
    idx = indice_api_senado()
    for p in faltam:
        i = achar_na_api(p["nome"], idx)
        url = (i or {}).get("UrlFotoParlamentar")
        if not url:
            print(f"  - {p['nome']}: sem foto na API do Senado" + ("" if i else " (nome não encontrado)"))
            continue
        destino = PASTA_FOTOS / f"{p['id']}.jpg"
        print("  foto do Senado:", p["nome"])
        if salvar_foto(url.replace("http://", "https://"), destino):
            manifesto[p["id"]] = f"senado:{i['CodigoParlamentar']}"


def ler_aba(ws, cols, casa, eleicao_padrao, vistos, manifesto, baixar):
    def c(r, k):
        i = cols[k]
        return r[i] if i is not None and i < len(r) else None

    eleicao, perfis = eleicao_padrao, []
    for r in ws.iter_rows(min_row=2, values_only=True):
        r = list(r) + [None] * 20
        if not r[3] and r[0] and str(r[0]).upper().startswith("ELEITOS"):
            eleicao = "Eleito em 2022" if "2022" in str(r[0]) else "Eleito em 2026"
            continue
        nome = nome_proprio(r[cols["nome"]])
        if not nome:
            continue
        uf = texto(c(r, "uf")).upper()
        pid = slug(nome)
        if pid in vistos:  # homônimo ou mesmo nome em outra casa
            pid = f"{pid}-{slug(uf) or ('camara' if casa.startswith('C') else 'senado')}"
        assert pid not in vistos, f"nome repetido: {nome}"
        vistos.add(pid)
        pronto = texto(c(r, "status")).lower() == "feito"
        p = {"id": pid, "casa": casa, "nome": nome, "partido": partido(c(r, "partido")), "uf": uf,
             "eleicao": eleicao, "pronto": pronto, "revisado": bool(c(r, "revisao")) and pronto}
        if pronto:
            foto = PASTA_FOTOS / f"{pid}.jpg"
            fid = id_drive(texto(c(r, "foto")))
            if baixar and fid and (not foto.exists() or manifesto.get(pid) != fid):
                print("baixando", nome)
                if baixar_foto(fid, foto):
                    manifesto[pid] = fid
            oficial = urls(c(r, "pagina"))
            p.update({
                "situacao": situacao(c(r, "situacao")), "naturalidade": texto(c(r, "naturalidade")),
                "formacao": texto(c(r, "formacao")), "ocupacao": texto(c(r, "ocupacao")),
                "cargos": texto(c(r, "cargos")), "areas": areas(c(r, "areas")),
                "redes": [{"rotulo": rotulo_rede(u), "url": u} for u in urls(c(r, "redes"))],
                "foto": f"assets/fotos/{pid}.jpg" if foto.exists() else "",
                "minibio": re.sub(r"\n{3,}", "\n\n", texto(c(r, "minibio"))),
                "pagina_oficial": oficial[0] if oficial else "",
                "fontes": urls(c(r, "fontes")),
            })
        elif (PASTA_FOTOS / f"{pid}.jpg").exists():
            p["foto"] = f"assets/fotos/{pid}.jpg"
        perfis.append(p)
    return perfis


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--fotos", action="store_true")
    args = ap.parse_args()

    wb = openpyxl.load_workbook(args.xlsx, data_only=True)
    manifesto = json.loads(MANIFESTO.read_text()) if MANIFESTO.exists() else {}
    vistos = set()
    perfis = ler_aba(wb["SENADO"], SENADO, "Senado Federal", "Eleito em 2026", vistos, manifesto, args.fotos)
    perfis += ler_aba(wb["CÂMARA"], CAMARA, "Câmara dos Deputados", "Eleito em 2026", vistos, manifesto, args.fotos)

    if args.fotos:
        fotos_do_senado(perfis, manifesto)
        for p in perfis:
            if (PASTA_FOTOS / f"{p['id']}.jpg").exists() and not p.get("foto") and p["casa"] == "Senado Federal":
                p["foto"] = f"assets/fotos/{p['id']}.jpg"

    if args.fotos:  # apaga fotos de quem saiu da planilha
        PASTA_FOTOS.mkdir(parents=True, exist_ok=True)
        for f in PASTA_FOTOS.glob("*.jpg"):
            if f.stem not in vistos:
                print("removendo foto órfã", f.name)
                f.unlink()
                manifesto.pop(f.stem, None)
        MANIFESTO.write_text(json.dumps(manifesto, indent=1, sort_keys=True))

    linhas = ",\n".join(" " + json.dumps(p, ensure_ascii=False) for p in perfis)
    saida = RAIZ / "data" / "dados.js"
    saida.write_text(
        "// GERADO por scripts/xlsx_para_dados.py a partir das abas SENADO e CÂMARA. Não edite à mão.\n"
        "window.DADOS = [\n" + linhas + "\n];\n", encoding="utf-8")
    for casa in ("Senado Federal", "Câmara dos Deputados"):
        g = [p for p in perfis if p["casa"] == casa]
        print(f"{casa}: {len(g)} | prontos {sum(p['pronto'] for p in g)} | revisados {sum(p['revisado'] for p in g)}")
    print("->", saida)


if __name__ == "__main__":
    main()
