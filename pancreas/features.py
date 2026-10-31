"""Engenharia de atributos dos biomarcadores urinários."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

BIOMARCADORES_URINARIOS = ["lyve1", "reg1b", "tff1"]

# Painel do artigo (PancRISK): LYVE1, REG1B, TFF1 + creatinina urinária + idade.
FEATURES_PAINEL = ["idade", "creatinina", "lyve1", "reg1b", "tff1"]
FEATURES_PAINEL_CA199 = FEATURES_PAINEL + ["ca19_9"]

# Deslocamento do log por variável (evita log(0); valores na unidade do dataset).
DESLOCAMENTO_LOG = {
    "creatinina": 0.01,
    "lyve1": 0.001,
    "reg1b": 0.01,
    "tff1": 0.01,
    "ca19_9": 1.0,
}

UNIDADES = {
    "idade": "anos",
    "creatinina": "mg/mL (urina)",
    "lyve1": "ng/mL (urina)",
    "reg1b": "ng/mL (urina)",
    "tff1": "ng/mL (urina)",
    "ca19_9": "U/mL (plasma)",
}


class EngenhariaBiomarcadores(BaseEstimator, TransformerMixin):
    """Aplica log aos analitos e, opcionalmente, cria razões biomarcador/creatinina.

    As razões normalizam a concentração da urina (amostra mais ou menos diluída).
    Em modelos lineares elas são redundantes (log(a/c) = log a − log c), por isso
    ficam como hiperparâmetro e a validação cruzada decide quando usar.
    """

    def __init__(self, razoes_creatinina: bool = False):
        self.razoes_creatinina = razoes_creatinina

    def fit(self, X, y=None):
        self.colunas_entrada_ = list(pd.DataFrame(X).columns)
        self.colunas_saida_ = list(self._transformar(pd.DataFrame(X).head(1)).columns)
        return self

    def _transformar(self, X: pd.DataFrame) -> pd.DataFrame:
        saida = pd.DataFrame(index=X.index)
        for coluna in X.columns:
            valores = X[coluna].astype(float)
            if coluna in DESLOCAMENTO_LOG:
                saida[f"log_{coluna}"] = np.log(valores.clip(lower=0) + DESLOCAMENTO_LOG[coluna])
            else:
                saida[coluna] = valores
        if self.razoes_creatinina and "creatinina" in X.columns:
            for marcador in BIOMARCADORES_URINARIOS:
                if marcador in X.columns:
                    saida[f"log_{marcador}_por_creatinina"] = saida[f"log_{marcador}"] - saida["log_creatinina"]
        return saida

    def transform(self, X):
        X = pd.DataFrame(X, columns=getattr(self, "colunas_entrada_", None))
        return self._transformar(X)

    def get_feature_names_out(self, input_features=None):
        return np.asarray(self.colunas_saida_, dtype=object)
