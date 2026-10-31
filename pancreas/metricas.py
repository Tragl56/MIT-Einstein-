"""Métricas de desempenho clínico com intervalos de confiança.

Tudo aqui opera sobre rótulos binários (1 = PDAC) e probabilidades previstas.
"""

from __future__ import annotations

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score, roc_curve

from .config import SEMENTE

# Prevalências usadas para mostrar como o VPP/VPN mudam fora do estudo caso-controle
# (no dataset de treino, 34% das amostras são PDAC — muito acima da vida real).
PREVALENCIAS_REFERENCIA = {
    "populacao_alto_risco_vigilancia": 0.01,
    "sintomaticos_atencao_primaria": 0.03,
    "encaminhados_gastro_oncologia": 0.15,
}


def wilson(sucessos: int, total: int, z: float = 1.96) -> tuple[float, float]:
    """Intervalo de confiança de Wilson para uma proporção."""
    if total == 0:
        return (float("nan"), float("nan"))
    p = sucessos / total
    denominador = 1 + z**2 / total
    centro = (p + z**2 / (2 * total)) / denominador
    margem = z * np.sqrt(p * (1 - p) / total + z**2 / (4 * total**2)) / denominador
    return (max(0.0, centro - margem), min(1.0, centro + margem))


def auc_com_ic(y, p, n_boot: int = 2000, semente: int = SEMENTE) -> dict:
    """AUROC com IC 95% por bootstrap estratificado (reamostra dentro de cada classe)."""
    y = np.asarray(y)
    p = np.asarray(p)
    gerador = np.random.default_rng(semente)
    positivos = np.flatnonzero(y == 1)
    negativos = np.flatnonzero(y == 0)
    amostras = []
    for _ in range(n_boot):
        indices = np.concatenate([
            gerador.choice(positivos, size=positivos.size, replace=True),
            gerador.choice(negativos, size=negativos.size, replace=True),
        ])
        amostras.append(roc_auc_score(y[indices], p[indices]))
    baixo, alto = np.percentile(amostras, [2.5, 97.5])
    return {"auc": float(roc_auc_score(y, p)), "ic95": [float(baixo), float(alto)]}


def calibracao(y, p) -> dict:
    """Calibração-no-geral (média observada − média prevista) e inclinação de calibração."""
    y = np.asarray(y)
    p = np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    logito = np.log(p / (1 - p)).reshape(-1, 1)
    inclinacao = LogisticRegression(C=1e6, max_iter=1000).fit(logito, y).coef_[0, 0]
    return {
        "calibracao_no_geral": float(y.mean() - p.mean()),
        "inclinacao": float(inclinacao),
        "brier": float(brier_score_loss(y, p)),
    }


def limiar_para_sensibilidade(y, p, alvo: float) -> float:
    """Maior limiar cuja sensibilidade é >= alvo (maximiza especificidade dada a sensibilidade)."""
    fpr, tpr, limiares = roc_curve(y, p)
    indice = int(np.argmax(tpr >= alvo))
    return float(min(limiares[indice], 1.0))


def limiar_para_especificidade(y, p, alvo: float) -> float:
    """Menor limiar cuja especificidade é >= alvo (maximiza sensibilidade dada a especificidade)."""
    fpr, tpr, limiares = roc_curve(y, p)
    validos = np.flatnonzero(fpr <= 1 - alvo)
    return float(min(limiares[validos[-1]], 1.0))


def limiar_youden(y, p) -> float:
    fpr, tpr, limiares = roc_curve(y, p)
    return float(min(limiares[int(np.argmax(tpr - fpr))], 1.0))


def valores_preditivos(sensibilidade: float, especificidade: float, prevalencia: float) -> dict:
    """VPP e VPN pelo teorema de Bayes para uma prevalência escolhida."""
    vp = sensibilidade * prevalencia
    fp = (1 - especificidade) * (1 - prevalencia)
    vn = especificidade * (1 - prevalencia)
    fn = (1 - sensibilidade) * prevalencia
    return {
        "vpp": float(vp / (vp + fp)) if vp + fp > 0 else float("nan"),
        "vpn": float(vn / (vn + fn)) if vn + fn > 0 else float("nan"),
    }


def metricas_no_limiar(y, p, limiar: float) -> dict:
    """Sensibilidade, especificidade, VPP, VPN (com IC de Wilson) e contagens no limiar."""
    y = np.asarray(y)
    previsto = np.asarray(p) >= limiar
    vp = int(np.sum(previsto & (y == 1)))
    fn = int(np.sum(~previsto & (y == 1)))
    vn = int(np.sum(~previsto & (y == 0)))
    fp = int(np.sum(previsto & (y == 0)))
    sens = vp / (vp + fn) if vp + fn else float("nan")
    espec = vn / (vn + fp) if vn + fp else float("nan")
    return {
        "limiar": float(limiar),
        "sensibilidade": float(sens),
        "sensibilidade_ic95": list(wilson(vp, vp + fn)),
        "especificidade": float(espec),
        "especificidade_ic95": list(wilson(vn, vn + fp)),
        "vpp_no_estudo": float(vp / (vp + fp)) if vp + fp else float("nan"),
        "vpn_no_estudo": float(vn / (vn + fn)) if vn + fn else float("nan"),
        "vpp_vpn_por_prevalencia": {
            nome: valores_preditivos(sens, espec, prev) | {"prevalencia": prev}
            for nome, prev in PREVALENCIAS_REFERENCIA.items()
        },
        "contagens": {"vp": vp, "fp": fp, "vn": vn, "fn": fn},
    }


def resumo_discriminacao(y, p, n_boot: int = 2000) -> dict:
    """AUROC com IC, AUPRC, Brier e calibração num único dicionário."""
    return {
        "n": int(len(y)),
        "n_pdac": int(np.sum(y)),
        "auroc": auc_com_ic(y, p, n_boot=n_boot),
        "auprc": float(average_precision_score(y, p)),
        **calibracao(y, p),
    }
