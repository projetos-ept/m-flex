# Histórico

## 1.2.0 — 2026-11-02

- Botões Importar JSON e Exportar JSON diretamente no editor; exportação JSON exige prévia válida do código atual.
- Copiar prompt IA com tema de até 2.000 caracteres, prévia completa e cópia para a área de transferência com alternativa manual.
- Prompt local com modelo JSON validado, UUID e datas novos, schema atual e os 36 IDs de presets. Preserva ajustes visuais e composição, sem copiar a fonte atual ou a chave do espaço.
- Personalizar nó central: edição segura do rótulo de mindmaps e ajustes opcionais `rootFill`, `rootText`, `rootBorder` e `rootRadius`, com contraste automático e restauração independente.
- Contrato JSON permanece v1. Leitores 1.0.0/1.1.0 recusam os novos ajustes centrais; frontend e Worker devem ser atualizados juntos. Sem migração SQL ou novos serviços Cloudflare.
- Documentação de uso, compatibilidade e privacidade atualizada. Validação: 123 testes unitários, 35 verificações de API, typecheck e build aprovados; cópia do prompt, edição HTML/SVG e exportação/reimportação JSON conferidas na interface. Escopo em [TESTES](docs/TESTES.md).

## 1.1.0 — 2026-11-01

- Composição HTML/CSS sobre a geometria Mermaid, com cartões, título, subtítulo e rodapé opcional.
- Preservação de formas especiais dos fluxogramas em SVG, incluindo losangos e círculos; apenas nós retangulares recebem cartões HTML.
- Layouts Estúdio, Pôster e Glass, integrados aos 36 presets e aos ajustes de estilo.
- Exportação PNG da composição inteira, independente de zoom, e HTML autossuficiente sem scripts ou recursos externos.
- Exportação SVG identificada como diagrama Mermaid, preservando o arquivo vetorial sem a camada HTML.
- Campo opcional `composition` no JSON v1. Mapas antigos preservam o modo SVG; leitores 1.0.0 exigem remover esse campo.
- Documentação de compatibilidade, segurança, exportação e verificação da nova composição.
- Validação: 34 testes unitários, 33 verificações da API local, TypeScript e build Vite aprovados; auditoria npm sem vulnerabilidades conhecidas. Downloads PNG/HTML conferidos em desenvolvimento, incluindo composição completa após zoom. Escopo detalhado em [TESTES](docs/TESTES.md).

## 1.0.0 — 2026-10-07

- Editor Mermaid em português com prévia, zoom, movimento e tela cheia.
- 36 estilos predefinidos, 12 tokens dinâmicos e biblioteca local.
- Projeto JSON v1 validado, SVG, PNG e exportação `.mmd`.
- API Cloudflare Workers, D1 com revisões e snapshots privados R2.
- Workers AI com modelo fixo, cotas e proteção de entrada.
- Documentação de instalação, operação, API, formato, estilos, cotas, segurança e testes.
