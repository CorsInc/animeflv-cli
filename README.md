# animeflv-cli

CLI para buscar anime y obtener links de streaming desde [AnimeFLV.net](https://animeflv.net).

Scraping ligero con **Axios** + **Cheerio** — sin Puppeteer, sin navegador.

## Instalación

```bash
git clone https://github.com/CorsInc/animeflv-cli.git
cd animeflv-cli
npm install
```

## Uso

```
node index.js <comando> [opciones]
```

### Comandos

| Comando | Descripción |
|---------|-------------|
| `search <query>` | Busca anime por nombre |
| `info <slug>` | Muestra info del anime + lista de episodios |
| `links <slug> <ep>` | Obtiene links de streaming de un episodio |
| `all <slug>` | Info + links de **todos** los episodios |

### Ejemplos

```bash
# Buscar
node index.js search "dragon ball"

# Info + episodios
node index.js info shingeki-no-kyojin

# Links de streaming del episodio 1
node index.js links shingeki-no-kyojin 1

# Todo: info + links de cada episodio
node index.js all one-piece
```

## Funcionalidades

- **Búsqueda** por nombre de anime
- **Info detallada**: título, sinopsis, géneros, estado, tipo
- **Lista de episodios** con números secuenciales
- **Links de streaming** por episodio desde múltiples servidores:
  - StreamWish
  - Mega
  - YourUpload
  - Mail.ru
  - OK.ru
  - Netu (HQQ)
  - StreamTape
- **Sin dependencias pesadas** — solo Axios y Cheerio

## Cómo funciona

El scraper parsea el HTML de AnimeFLV.net directamente. Los datos de episodios y videos se extraen de variables JavaScript incrustadas en la página (`var episodes`, `var videos`), no de APIs públicas.

## Disclaimer

Este proyecto es **solo para fines educativos**. No aloja ni distribuye contenido protegido por derechos de autor. Usa el servicio bajo tu propia responsabilidad.
