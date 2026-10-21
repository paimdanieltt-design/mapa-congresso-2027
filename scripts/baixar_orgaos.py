#!/usr/bin/env python3
"""Baixa Mesa Diretora, lideranças e comissões permanentes da Câmara e do Senado
(APIs de dados abertos de cada Casa) e gera data/orgaos.js.

Uso:
    pip install pillow            # só para reduzir as fotos
    python3 scripts/baixar_orgaos.py [--sem-fotos]

As fotos oficiais (reduzidas) vão para assets/fotos-casas/ e são usadas na Mesa, nas lideranças e
nas páginas de comissão. "fid" = c<id do deputado> ou s<código do senador>.

Os dados refletem quem ocupa os cargos HOJE (legislatura 2023-2027). Mesa, lideranças e
presidências de comissões são renovadas a partir de fevereiro de 2027: rode o script de novo
depois disso.
"""
import io
import json
import os
import re
import ssl
import sys
import time
import unicodedata
import urllib.request
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CAM = "https://dadosabertos.camara.leg.br/api/v2"
SEN = "https://legis.senado.leg.br/dadosabertos"
LEGISLATURA = 57

PARTIDOS = {"UNIAO": "União", "UNIAO BRASIL": "União", "REPUBLICANOS": "Republicanos", "PODE": "Podemos",
            "PODEMOS": "Podemos", "PCDOB": "PCdoB", "AVANTE": "Avante", "SOLIDARIEDADE": "Solidariedade",
            "MISSAO": "Missão", "NOVO": "Novo", "REDE": "Rede", "SEM PARTIDO": "Sem partido",
            "REPUBLIC": "Republicanos", "SOLIDARI": "Solidariedade"}  # a API de membros da Câmara trunca estas siglas
ORDEM_MESA_CAM = ["Presidente", "1º Vice-Presidente", "2º Vice-Presidente", "1º Secretário", "2º Secretário",
                  "3º Secretário", "4º Secretário", "1º Suplente de Secretário", "2º Suplente de Secretário",
                  "3º Suplente de Secretário", "4º Suplente de Secretário"]


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def partido(p):
    p = (p or "").strip()
    return PARTIDOS.get(sem_acento(p).upper(), p)


def baixar(url):
    ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
    for tentativa in range(4):
        try:
            time.sleep(0.15)
            return json.loads(urllib.request.urlopen(req, timeout=60, context=ctx).read())
        except Exception as e:  # noqa: BLE001
            if tentativa == 3:
                raise
            print(f"  nova tentativa ({e})", file=sys.stderr)
            time.sleep(2 ** tentativa)


def todas_as_paginas(url):
    itens, pagina = [], 1
    while True:
        sep = "&" if "?" in url else "?"
        dados = baixar(f"{url}{sep}itens=100&pagina={pagina}")["dados"]
        itens += dados
        if len(dados) < 100:
            return itens
        pagina += 1


def pessoa(nome, part, uf, fid=None):
    p = {"nome": nome.strip(), "partido": partido(part), "uf": (uf or "").strip()}
    if fid:
        p["fid"] = fid
    return p


def sem_tratamento(nome):
    return re.sub(r"^(Senador|Senadora)\s+", "", nome.strip())


def bancada(txt):  # "(UNIÃO-AP)" -> ("UNIÃO", "AP")
    m = re.match(r"\(([^-)]+)-([A-Z]{2})\)", (txt or "").strip())
    return (m.group(1), m.group(2)) if m else ("", "")


# ---------------------------------------------------------------- Câmara
def camara():
    print("Câmara: Mesa Diretora")
    mesa = [x for x in baixar(f"{CAM}/legislaturas/{LEGISLATURA}/mesa")["dados"] if not x.get("dataFim")]
    mesa.sort(key=lambda x: ORDEM_MESA_CAM.index(x["titulo"]) if x["titulo"] in ORDEM_MESA_CAM else 99)
    mesa = [{"cargo": x["titulo"], **pessoa(x["nome"], x["siglaPartido"], x["siglaUf"], f"c{x['id']}")} for x in mesa]

    print("Câmara: lideranças")
    ativos = [x for x in todas_as_paginas(f"{CAM}/legislaturas/{LEGISLATURA}/lideres") if not x.get("dataFim")]
    grupos = {}
    for x in ativos:
        b = x["bancada"]
        chave = (b["tipo"], b["nome"])
        g = grupos.setdefault(chave, {"tipo": b["tipo"], "nome": b["nome"], "lider": None, "vices": 0})
        p = x["parlamentar"]
        if x["titulo"] == "Líder":
            g["lider"] = pessoa(p["nome"], p["siglaPartido"], p["siglaUf"], f"c{p['id']}")
        elif "Vice" in x["titulo"]:
            g["vices"] += 1
    def grupo(tipos, rotulo=None):
        return [{"nome": rotulo or g["nome"], "lider": g["lider"], "vices": g["vices"]}
                for g in sorted(grupos.values(), key=lambda g: g["nome"]) if g["tipo"] in tipos and g["lider"]]
    liderancas = {"governo": grupo(("Governo na CD", "Governo no CN")),
                  "blocos": grupo(("Bloco Parlamentar",)), "partidos": grupo(("Partido Político",))}
    for g in liderancas["governo"]:
        g["nome"] = {"Governo na CD": "Governo na Câmara", "Governo no CN": "Governo no Congresso Nacional"}.get(g["nome"], g["nome"])
    for g in liderancas["partidos"]:
        g["nome"] = partido(g["nome"])

    print("Câmara: comissões permanentes")
    comissoes = []
    for o in baixar(f"{CAM}/orgaos?codTipoOrgao=2&itens=100")["dados"]:
        membros = todas_as_paginas(f"{CAM}/orgaos/{o['id']}/membros")
        pessoa_c = lambda m: pessoa(m["nome"], m["siglaPartido"], m["siglaUf"], f"c{m['id']}")
        pres = next((m for m in membros if m["titulo"] == "Presidente"), None)
        vices = [{"cargo": m["titulo"], **pessoa_c(m)}
                 for m in sorted(membros, key=lambda m: m["titulo"]) if "Vice-Presidente" in m["titulo"]]
        ordem = {"Presidente": 0, "1º Vice-Presidente": 1, "2º Vice-Presidente": 2, "3º Vice-Presidente": 3, "Titular": 4, "Suplente": 5}
        lista_membros = [{"tipo": m["titulo"], **pessoa_c(m)} for m in sorted(membros, key=lambda m: (ordem.get(m["titulo"], 9), m["nome"]))]
        comissoes.append({"sigla": o["sigla"], "nome": o["nome"],
                          "presidente": pessoa_c(pres) if pres else None,
                          "vices": vices, "titulares": sum(m["titulo"] == "Titular" for m in membros),
                          "suplentes": sum(m["titulo"] == "Suplente" for m in membros), "membros": lista_membros})
        print("  ", o["sigla"])
    comissoes.sort(key=lambda c: c["nome"])
    return {"mesa": mesa, "liderancas": liderancas, "comissoes": comissoes}


# ---------------------------------------------------------------- Senado
def senado():
    print("Senado: Mesa Diretora")
    cargos = baixar(f"{SEN}/composicao/mesaSF")["MesaSenado"]["Colegiados"]["Colegiado"][0]["Cargos"]["Cargo"]
    mesa = []
    for x in cargos:
        part, uf = bancada(x["Bancada"])
        cargo = (x["Cargo"][0] if isinstance(x["Cargo"], list) else x["Cargo"]).title()  # "1º VICE-PRESIDENTE" -> "1º Vice-Presidente"
        mesa.append({"cargo": cargo, **pessoa(sem_tratamento(x["NomeParlamentar"]), part, uf, f"s{x['Http']}" if x.get("Http") else None)})

    print("Senado: lideranças")
    registros = [y for y in baixar(f"{SEN}/composicao/lideranca") if y.get("casa") == "SF"]
    unidades = {}
    for y in registros:
        u = unidades.setdefault((y["siglaTipoUnidadeLideranca"], y.get("nomeBloco") or y.get("nomePartido") or y["descricaoTipoUnidadeLideranca"]),
                                {"tipo": y["siglaTipoUnidadeLideranca"], "nome": None, "lider": None, "vices": 0})
        if y["siglaTipoUnidadeLideranca"] == "B":
            u["nome"] = y.get("nomeBloco")
        elif y["siglaTipoUnidadeLideranca"] == "P":
            u["nome"] = partido(y.get("siglaPartido") or y.get("nomePartido") or "")
        else:
            u["nome"] = y["descricaoTipoUnidadeLideranca"].replace(" no Senado Federal", "")
        p = pessoa(y["nomeParlamentar"], y["siglaPartidoFiliacao"], y["uf"], f"s{y['codigoParlamentar']}" if y.get("codigoParlamentar") else None)
        if y["siglaTipoLideranca"] == "L":
            u["lider"] = p
        else:
            u["vices"] += 1
    ordem_especial = ["G", "R", "N", "S", "F"]  # governo, maioria, minoria, oposição, bancada feminina
    def grupo(tipos):
        return [{"nome": u["nome"], "lider": u["lider"], "vices": u["vices"]}
                for u in sorted(unidades.values(), key=lambda u: (ordem_especial.index(u["tipo"]) if u["tipo"] in ordem_especial else 0, u["nome"] or ""))
                if u["tipo"] in tipos and u["lider"]]
    liderancas = {"governo": grupo(("G", "R", "N", "S", "F")), "blocos": grupo(("B",)), "partidos": grupo(("P",))}

    print("Senado: comissões permanentes")
    lista = baixar(f"{SEN}/comissao/lista/colegiados")["ListaColegiados"]["Colegiados"]["Colegiado"]
    comissoes = []
    for c in lista:
        if c.get("SiglaCasa") != "SF" or c.get("DescricaoTipoColegiado") != "Comissão Permanente":
            continue
        det = baixar(f"{SEN}/comissao/{c['Codigo']}")["ComissoesCongressoNacional"]["Colegiados"]["Colegiado"][0]
        cs = (det.get("Cargos") or {}).get("Cargo") or []
        cs = cs if isinstance(cs, list) else [cs]
        def de(c_):
            part, uf = bancada(c_.get("Bancada"))
            return pessoa(sem_tratamento(c_["NomeParlamentar"]), part, uf, f"s{c_['CodigoParlamentar']}" if c_.get("CodigoParlamentar") else None)
        pres = next((de(x) for x in cs if x["TipoCargo"] == "PRESIDENTE"), None)
        vices = [{"cargo": "Vice-Presidente", **de(x)} for x in cs if x["TipoCargo"] == "VICE-PRESIDENTE"]
        dist = ((det.get("QuantidadesMembros") or {}).get("Distribuicao")) or {}
        membros, vagas = [], 0
        for un in ((det.get("MembrosBlocoSF") or {}).get("PartidoBloco")) or []:
            ms = (un.get("MembrosSF") or {}).get("Membro") or []
            for m in (ms if isinstance(ms, list) else [ms]):
                if m.get("NomeParlamentar", "VAGO").strip().upper() == "VAGO":
                    vagas += 1
                    continue
                tipo = m.get("TipoVaga") or "Titular"
                if pres and m.get("CodigoParlamentar") and pres.get("fid") == f"s{m['CodigoParlamentar']}":
                    tipo = "Presidente"
                elif any(v.get("fid") == f"s{m.get('CodigoParlamentar')}" for v in vices):
                    tipo = "Vice-Presidente"
                membros.append({"tipo": tipo, **pessoa(sem_tratamento(m["NomeParlamentar"]), m.get("Partido"), m.get("SiglaUf"), f"s{m['CodigoParlamentar']}" if m.get("CodigoParlamentar") else None)})
        ordem = {"Presidente": 0, "Vice-Presidente": 1, "Titular": 2, "Suplente": 3}
        membros.sort(key=lambda m: (ordem.get(m["tipo"], 9), m["nome"]))
        comissoes.append({"sigla": c["Sigla"], "nome": c["Nome"], "presidente": pres, "vices": vices,
                          "titulares": int(dist.get("SenadoresTitulares") or 0), "suplentes": int(dist.get("SenadoresSuplentes") or 0),
                          "vagas": vagas, "membros": membros})
        print("  ", c["Sigla"])
    comissoes.sort(key=lambda c: c["nome"])
    return {"mesa": mesa, "liderancas": liderancas, "comissoes": comissoes}


def todas_as_pessoas(no):
    if isinstance(no, dict):
        if "fid" in no:
            yield no["fid"]
        for v in no.values():
            yield from todas_as_pessoas(v)
    elif isinstance(no, list):
        for v in no:
            yield from todas_as_pessoas(v)


def baixar_fotos(fids):
    pasta = RAIZ / "assets" / "fotos-casas"
    pasta.mkdir(parents=True, exist_ok=True)
    ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
    from PIL import Image
    novas = falhas = 0
    for fid in sorted(set(fids)):
        destino = pasta / f"{fid}.jpg"
        if destino.exists():
            continue
        url = (f"https://www.camara.leg.br/internet/deputado/bandep/{fid[1:]}.jpg" if fid[0] == "c"
               else f"https://www.senado.leg.br/senadores/img/fotos-oficiais/senador{fid[1:]}.jpg")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            img = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=40, context=ctx).read())).convert("RGB")
            img.thumbnail((160, 200))
            img.save(destino, "JPEG", quality=78, optimize=True)
            novas += 1
        except Exception as e:  # noqa: BLE001
            falhas += 1
            print(f"  ! sem foto para {fid}: {e}", file=sys.stderr)
    print(f"fotos: {novas} novas, {falhas} falhas, {len(list(pasta.glob('*.jpg')))} no total")


def main():
    dados = {"geradoEm": date.today().strftime("%d/%m/%Y"), "legislatura": "57ª legislatura (2023-2027)",
             "camara": camara(), "senado": senado()}
    saida = RAIZ / "data" / "orgaos.js"
    saida.write_text("// GERADO por scripts/baixar_orgaos.py (APIs de dados abertos da Câmara e do Senado). Não edite à mão.\n"
                     "window.ORGAOS = " + json.dumps(dados, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    if "--sem-fotos" not in sys.argv:
        baixar_fotos(todas_as_pessoas(dados))
    for casa in ("camara", "senado"):
        d = dados[casa]
        print(f"{casa}: mesa {len(d['mesa'])} | governo {len(d['liderancas']['governo'])} blocos {len(d['liderancas']['blocos'])} "
              f"partidos {len(d['liderancas']['partidos'])} | comissões {len(d['comissoes'])}")
    print("->", saida)


if __name__ == "__main__":
    main()
