#!/usr/bin/env python3
"""Converte a aba SENADO da planilha de perfis em data/dados.js.

Uso:
    pip install openpyxl pillow
    python3 scripts/xlsx_para_dados.py caminho/da/planilha.xlsx [--fotos]

--fotos baixa as fotos (links do Google Drive públicos) para assets/fotos/,
redimensionadas. Sem a flag, só usa as fotos que já estão na pasta.

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
PARTIDOS = {
    "UNIAO BRASIL": "União", "UNIAO": "União", "REPUBLICANOS": "Republicanos",
    "NOVO": "Novo", "REDE": "Rede", "PODE": "Podemos", "PODEMOS": "Podemos",
    "SEM PARTIDO": "Sem partido",
}
TRACKING = ("utm_", "fbclid", "igsh", "igshid", "hl", "si", "ref", "mibextid")
REDES = {"instagram.com": "Instagram", "linktr.ee": "Linktree", "x.com": "X", "twitter.com": "X",
         "facebook.com": "Facebook", "tiktok.com": "TikTok", "youtube.com": "YouTube",
         "youtu.be": "YouTube", "kwai.com": "Kwai", "threads.net": "Threads"}


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", sem_acento(s).lower()).strip("-")


def texto(v):
    return re.sub(r"[ \t]+", " ", str(v)).strip() if v is not None else ""


def partido(v):
    t = texto(v)
    return PARTIDOS.get(sem_acento(t).upper(), t)


def situacao(v):
    t = texto(v)
    if t.lower().startswith("eleito em 2022"):
        return "Eleito em 2022"
    return {"Novata": "Novato"}.get(t, t)


REDIRECIONADORES = {"l.instagram.com": "u", "l.facebook.com": "u", "lm.facebook.com": "u",
                    "www.google.com": "q", "google.com": "q"}


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


def baixar_foto(url, destino):
    fid = id_drive(url)
    if not fid:
        return False
    ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
    req = urllib.request.Request(f"https://drive.google.com/thumbnail?id={fid}&sz=w600",
                                 headers={"User-Agent": "Mozilla/5.0"})
    try:
        dados = urllib.request.urlopen(req, timeout=40, context=ctx).read()
        from PIL import Image
        img = Image.open(io.BytesIO(dados)).convert("RGB")
        img.thumbnail((400, 500))
        destino.parent.mkdir(parents=True, exist_ok=True)
        img.save(destino, "JPEG", quality=82, optimize=True)
        return True
    except Exception as e:  # noqa: BLE001
        print(f"  ! foto falhou ({destino.name}): {e}", file=sys.stderr)
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--fotos", action="store_true")
    args = ap.parse_args()

    ws = openpyxl.load_workbook(args.xlsx, data_only=True)["SENADO"]
    eleicao = "Eleito em 2026"
    perfis, vistos = [], set()
    for r in ws.iter_rows(min_row=2, values_only=True):
        r = list(r) + [None] * (19 - len(r))
        if not r[3] and r[0] and str(r[0]).upper().startswith("ELEITOS"):
            eleicao = "Eleito em 2022" if "2022" in str(r[0]) else "Eleito em 2026"
            continue
        nome = texto(r[3])
        if not nome:
            continue
        pid = slug(nome)
        assert pid not in vistos, f"nome repetido: {nome}"
        vistos.add(pid)
        pronto = texto(r[1]).lower() == "feito"
        p = {"id": pid, "casa": "Senado Federal", "nome": nome, "partido": partido(r[4]),
             "uf": texto(r[5]).upper(), "eleicao": eleicao, "pronto": pronto,
             "revisado": bool(r[17]) and pronto}
        if pronto:
            foto = RAIZ / "assets" / "fotos" / f"{pid}.jpg"
            if args.fotos and r[13] and not foto.exists():
                print("baixando", nome)
                baixar_foto(texto(r[13]), foto)
            redes = urls(r[12])
            oficial = urls(r[15])
            p.update({
                "situacao": situacao(r[6]), "naturalidade": texto(r[7]), "formacao": texto(r[8]),
                "ocupacao": texto(r[9]), "cargos": texto(r[10]), "areas": areas(r[11]),
                "redes": [{"rotulo": rotulo_rede(u), "url": u} for u in redes],
                "foto": f"assets/fotos/{pid}.jpg" if foto.exists() else "",
                "minibio": re.sub(r"\n{3,}", "\n\n", texto(r[14])),
                "pagina_oficial": oficial[0] if oficial else "",
                "fontes": urls(r[16]),
            })
        perfis.append(p)

    saida = RAIZ / "data" / "dados.js"
    saida.write_text(
        "// GERADO por scripts/xlsx_para_dados.py a partir da aba SENADO. Não edite à mão.\n"
        "window.DADOS = " + json.dumps(perfis, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8")
    prontos = sum(p["pronto"] for p in perfis)
    rev = sum(p["revisado"] for p in perfis)
    print(f"{len(perfis)} senadores | {prontos} prontos | {rev} revisados -> {saida}")


if __name__ == "__main__":
    main()
