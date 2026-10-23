#!/usr/bin/env python3
"""Ajuste puntual de los mensajes de retorno de Meta para Comunidad Semanal."""
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import shutil
import os

CARPETA = Path('api/servicios')
FACEBOOK = CARPETA / 'meta-pedidos.js'
INSTAGRAM = CARPETA / 'instagram-pedidos.js'
AVISO = 'Redes en Piloto podrá programar y publicar de forma automática en tu cuenta, los contenidos que hayas brindado.'


def facebook(texto):
    if 'Facebook conectado al pedido' not in texto or 'function pagina(' not in texto:
        raise ValueError('No se encontró la vista de confirmación de Facebook.')
    viejo = '<a href="/servicios/publicacion-automatica">Volver a mi pedido</a>'
    nuevo = '<a href="/servicios/publicacion-automatica/mi-panel">Volver a mi panel</a>'
    if viejo in texto:
        texto = texto.replace(viejo, nuevo, 1)
    if nuevo not in texto:
        raise ValueError('No se encontró el enlace de retorno a Facebook.')
    texto = texto.replace('<p>El acceso privado permanece solo en esta sesión del navegador.</p>', '', 1)
    texto = texto.replace('<p>El servicio todavía no realizará publicaciones.</p>', '', 1)
    patron = r'(return pagina\("Facebook conectado al pedido",\s*`)(.*?)(`\);)'
    encontrado = re.search(patron, texto, flags=re.S)
    if not encontrado:
        raise ValueError('No se pudo localizar el contenido de la confirmación de Facebook.')
    contenido = encontrado.group(2)
    if AVISO not in contenido:
        identificador = '<p>ID de página:'
        if identificador not in contenido:
            raise ValueError('No se encontró el ID de página para insertar el aviso de Facebook.')
        contenido = contenido.replace(identificador, f'<p>{AVISO}</p>{identificador}', 1)
    texto = texto[:encontrado.start(2)] + contenido + texto[encontrado.end(2):]
    return texto


def instagram(texto):
    if 'Instagram conectado al pedido' not in texto or 'function vista(' not in texto:
        raise ValueError('No se encontró la confirmación de Instagram.')
    texto = texto.replace('<small>No se realizaron publicaciones ni se modificó Facebook.</small>', '', 1)
    patron = r'(return vista\("Instagram conectado al pedido",\s*`)(.*?)(`\);)'
    encontrado = re.search(patron, texto, flags=re.S)
    if not encontrado:
        raise ValueError('No se pudo localizar el mensaje de Instagram.')
    contenido = encontrado.group(2)
    contenido = contenido.replace(' La prueba gratuita todavía no comenzó.', '')
    if AVISO not in contenido:
        if 'quedó vinculada al pedido.' not in contenido:
            raise ValueError('No se encontró el texto para añadir la confirmación de Instagram.')
        contenido = contenido.replace('quedó vinculada al pedido.', f'quedó vinculada al pedido. {AVISO}', 1)
    texto = texto[:encontrado.start(2)] + contenido + texto[encontrado.end(2):]
    if 'Volver a mi panel' not in texto or '/servicios/publicacion-automatica/mi-panel' not in texto:
        raise ValueError('La página de Instagram no tiene el enlace al panel.')
    return texto


def main():
    for archivo in [FACEBOOK, INSTAGRAM]:
        if not archivo.is_file():
            sys.exit(f'ERROR: Falta {archivo}. Ejecutá el comando desde la raíz del proyecto.')

    cambios = [(FACEBOOK, facebook), (INSTAGRAM, instagram)]
    actualizados = []
    try:
        for archivo, transformar in cambios:
            original = archivo.read_text(encoding='utf-8')
            nuevo = transformar(original)
            actualizados.append((archivo, original, nuevo))
    except (ValueError, OSError) as error:
        sys.exit(f'ERROR: {error}. No se modificó ningún archivo.')

    # Validar sintaxis de ambos archivos antes de modificar los originales.
    for archivo, _, nuevo in actualizados:
        with tempfile.TemporaryDirectory() as temp:
            temporal = Path(temp) / archivo.name
            temporal.write_text(nuevo, encoding='utf-8')
            resultado = subprocess.run(['node', '--check', str(temporal)], capture_output=True, text=True)
            if resultado.returncode != 0:
                sys.exit(f'ERROR: Sintaxis inválida en {archivo}: {resultado.stderr.strip()}')

    for archivo, original, nuevo in actualizados:
        if original == nuevo:
            print(f'SIN CAMBIOS: {archivo} ya está actualizado.')
            continue
        respaldo = archivo.with_name(archivo.name + '.respaldo-confirmaciones')
        if not respaldo.exists():
            shutil.copy2(archivo, respaldo)
        temporal = archivo.with_name(archivo.name + '.meta-tmp')
        temporal.write_text(nuevo, encoding='utf-8')
        os.replace(temporal, archivo)
        print(f'OK: {archivo} actualizado. Respaldo: {respaldo}')
    print('Confirmaciones de Facebook e Instagram listas.')


if __name__ == '__main__':
    main()
