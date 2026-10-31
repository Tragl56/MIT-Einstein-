# Indicadores do OncoFlow (definições operacionais)

São indicadores de processo, definidos no documento do produto e a validar com o Cancer Center no piloto.
**Nunca exiba ou descreva um indicador como evidência de melhora de desfecho.** Todo card mostra o período, o
numerador, o denominador e, no MVP, o selo "dados fictícios".

| Indicador | Definição | Fonte |
|---|---|---|
| Tempo entre etapas | Mediana e P90 de `concluida_em(etapa N+1) − concluida_em(etapa N)` por linha de cuidado. Use mediana, nunca média: a distribuição é assimétrica. | `etapa_jornada` |
| Pendências vencidas | Quantidade de pendências abertas com `prazo < agora` e idade do atraso (mediana e máximo), por responsável. | `pendencia` |
| Continuidade | `etapas concluídas / etapas planejadas não canceladas`, por paciente e agregado. | `etapa_jornada` |
| Check-ins revisados no prazo | `alertas resolvidos com resolvido_em ≤ prazo_resposta / alertas criados` no período. | `alerta` |
| Tempo até validação da IA | Mediana de `validado_em − criado_em` dos itens extraídos, mais a taxa de rejeição por categoria (qualidade da IA). | `item_extraido` |
| Coordenação de visitas | Pares de compromissos do mesmo paciente em dias diferentes, com menos de 7 dias de intervalo, que poderiam ser agrupados (oportunidade, não erro). | `compromisso` |
| Experiência do paciente | Questionário curto no app (clareza dos próximos passos, acesso à informação, percepção de apoio). No MVP é só o desenho: não há dado. | — |

## SQL de referência

```sql
-- Pendências vencidas por responsável
select coalesce(u.nome, p.responsavel_papel) as responsavel,
       count(*)                                         as vencidas,
       percentile_cont(0.5) within group (order by now() - p.prazo) as atraso_mediano,
       max(now() - p.prazo)                             as atraso_maximo
from pendencia p
left join usuario u on u.id = p.responsavel_usuario_id
where p.estado in ('aberta', 'em_andamento') and p.prazo < now()
group by 1
order by vencidas desc;

-- Tempo entre etapas consecutivas concluídas
with ordenadas as (
  select paciente_id, ordem, concluida_em,
         lag(concluida_em) over (partition by paciente_id order by ordem) as anterior
  from etapa_jornada
  where estado = 'concluida'
)
select percentile_cont(0.5) within group (order by concluida_em - anterior) as mediana,
       percentile_cont(0.9) within group (order by concluida_em - anterior) as p90,
       count(*) as n_intervalos
from ordenadas
where anterior is not null;

-- Alertas resolvidos dentro do prazo
select count(*) filter (where estado = 'resolvido' and resolvido_em <= prazo_resposta)::float
       / nullif(count(*), 0) as taxa_no_prazo,
       count(*) as alertas
from alerta
where criado_em >= :inicio and criado_em < :fim;
```

Com n pequeno (menos de 10 intervalos ou alertas), mostre o número absoluto e o aviso "amostra pequena" no
lugar do percentual.
