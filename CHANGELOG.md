# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento: [SemVer](https://semver.org/).

## [Unreleased]

### Added
- Infra multi-tenant para VPS: `Dockerfile`, `docker-compose.yml`, Nginx edge + SPA (`infra/nginx/`)
- Scripts blue/green deploy e rollback (`infra/scripts/`)
- GitHub Actions: lint + tsc + build + docker push + SSH deploy (`.github/workflows/deploy.yml`)
- Documentação: `docs/Deploy.md`, `docs/Architecture.md`
