#!/bin/bash

# Script para configurar la base de datos en producción (Dokploy)
# Ejecutar dentro del contenedor del backend

echo "==================================================================="
echo "  JudiScribe - Configuración de Base de Datos en Producción"
echo "==================================================================="
echo ""

# Verificar conexión a la base de datos
echo "🔍 Verificando conexión a la base de datos..."
python -m app.scripts.verificar_bd

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ La base de datos ya tiene datos configurados."
    echo ""
    read -p "¿Deseas ejecutar el seed de nuevo? (s/N): " respuesta
    if [ "$respuesta" != "s" ] && [ "$respuesta" != "S" ]; then
        echo "Operación cancelada."
        exit 0
    fi
fi

echo ""
echo "🚀 Ejecutando seed de la base de datos..."
echo ""

python -m app.scripts.seed

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Seed completado exitosamente!"
    echo ""
    echo "Verificando datos nuevamente..."
    python -m app.scripts.verificar_bd
else
    echo ""
    echo "❌ Error al ejecutar el seed."
    exit 1
fi

echo ""
echo "==================================================================="
echo "  Configuración completada"
echo "==================================================================="
echo ""
echo "Credenciales de acceso:"
echo "  • Admin:     admin@judiscribe.pe / JudiScribe2024!"
echo "  • Digitador: digitador@judiscribe.pe / Digitador2024!"
echo ""
