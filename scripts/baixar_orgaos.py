#!/usr/bin/env python3
"""Baixa Mesa Diretora, lideranças e comissões permanentes da Câmara e do Senado
(APIs de dados abertos de cada Casa) e gera data/orgaos.js.

Uso (só biblioteca padrão do Python):
    python3 scripts/baixar_orgaos.py

Os dados refletem quem ocupa os cargos HOJE (legislatura 2023-2027). Mesa, lideranças e
presidências de comissões são renovadas a partir de fevereiro de 2027: rode o script de novo
depois disso.
"""
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
            "MISSAO": "Missão", "NOVO": "Novo", "REDE": "Rede", "SEM PARTIDO": "Sem partido"}
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


def pessoa(nome, part, uf):
    return {"nome": nome.strip(), "partido": partido(part), "uf": (uf or "").strip()}


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
    mesa = [{"cargo": x["titulo"], **pessoa(x["nome"], x["siglaPartido"], x["siglaUf"])} for x in mesa]

    print("Câmara: lideranças")
    ativos = [x for x in todas_as_paginas(f"{CAM}/legislaturas/{LEGISLATURA}/lideres") if not x.get("dataFim")]
    grupos = {}
    for x in ativos:
        b = x["bancada"]
        chave = (b["tipo"], b["nome"])
        g = grupos.setdefault(chave, {"tipo": b["tipo"], "nome": b["nome"], "lider": None, "vices": 0})
        p = x["parlamentar"]
        if x["titulo"] == "Líder":
            g["lider"] = pessoa(p["nome"], p["siglaPartido"], p["siglaUf"])
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
        pres = next((m for m in membros if m["titulo"] == "Presidente"), None)
        vices = [{"cargo": m["titulo"], **pessoa(m["nome"], m["siglaPartido"], m["siglaUf"])}
                 for m in sorted(membros, key=lambda m: m["titulo"]) if "Vice-Presidente" in m["titulo"]]
        comissoes.append({"sigla": o["sigla"], "nome": o["nome"],
                          "presidente": pessoa(pres["nome"], pres["siglaPartido"], pres["siglaUf"]) if pres else None,
                          "vices": vices, "titulares": sum(m["titulo"] == "Titular" for m in membros),
                          "suplentes": sum(m["titulo"] == "Suplente" for m in membros)})
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
        mesa.append({"cargo": cargo, **pessoa(sem_tratamento(x["NomeParlamentar"]), part, uf)})

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
        p = pessoa(y["nomeParlamentar"], y["siglaPartidoFiliacao"], y["uf"])
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
            return pessoa(sem_tratamento(c_["NomeParlamentar"]), part, uf)
        pres = next((de(x) for x in cs if x["TipoCargo"] == "PRESIDENTE"), None)
        vices = [{"cargo": "Vice-Presidente", **de(x)} for x in cs if x["TipoCargo"] == "VICE-PRESIDENTE"]
        dist = ((det.get("QuantidadesMembros") or {}).get("Distribuicao")) or {}
        comissoes.append({"sigla": c["Sigla"], "nome": c["Nome"], "presidente": pres, "vices": vices,
                          "titulares": int(dist.get("SenadoresTitulares") or 0), "suplentes": int(dist.get("SenadoresSuplentes") or 0)})
        print("  ", c["Sigla"])
    comissoes.sort(key=lambda c: c["nome"])
    return {"mesa": mesa, "liderancas": liderancas, "comissoes": comissoes}


def main():
    dados = {"geradoEm": date.today().strftime("%d/%m/%Y"), "legislatura": "57ª legislatura (2023-2027)",
             "camara": camara(), "senado": senado()}
    saida = RAIZ / "data" / "orgaos.js"
    saida.write_text("// GERADO por scripts/baixar_orgaos.py (APIs de dados abertos da Câmara e do Senado). Não edite à mão.\n"
                     "window.ORGAOS = " + json.dumps(dados, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    for casa in ("camara", "senado"):
        d = dados[casa]
        print(f"{casa}: mesa {len(d['mesa'])} | governo {len(d['liderancas']['governo'])} blocos {len(d['liderancas']['blocos'])} "
              f"partidos {len(d['liderancas']['partidos'])} | comissões {len(d['comissoes'])}")
    print("->", saida)


if __name__ == "__main__":
    main()
