#!/usr/bin/env python3
import sys
import json
import os

data = json.loads(sys.argv[1])
out_path = sys.argv[2]

sale    = data['sale']
items   = data.get('items', [])
client  = data['client']
company = data['company']
lang    = data.get('lang', 'en')

# Translations
translations = {
  'en': {
    'heading': 'SHIPPING LABEL',
    'from': 'FROM:',
    'to': 'TO:',
    'product': 'PRODUCT',
    'sku': 'SKU',
    'qty': 'QTY',
  },
  'ro': {
    'heading': 'ETICHETA DE EXPEDIERE',
    'from': 'DE LA:',
    'to': 'CATRE:',
    'product': 'PRODUS',
    'sku': 'SKU',
    'qty': 'CANT.',
  },
}

t = translations.get(lang, translations['en'])

from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors

W, H = A6  # 105 x 148 mm

c = canvas.Canvas(out_path, pagesize=A6)

# Border
c.setStrokeColor(colors.HexColor('#1a1916'))
c.setLineWidth(1.5)
c.rect(5*mm, 5*mm, W - 10*mm, H - 10*mm)

# Header
c.setFillColor(colors.HexColor('#1a1916'))
c.setFont('Helvetica-Bold', 7)
c.drawString(8*mm, H - 12*mm, t['heading'])
c.setFont('Helvetica', 7)
c.setFillColor(colors.HexColor('#666666'))
c.drawString(8*mm, H - 17*mm, f"Sale #{sale['id']}  |  {sale.get('date','')[:10]}")

# Line under header
c.setStrokeColor(colors.HexColor('#1a1916'))
c.setLineWidth(1)
c.line(8*mm, H - 20*mm, W - 8*mm, H - 20*mm)

# FROM section
y = H - 26*mm
c.setFillColor(colors.HexColor('#666666'))
c.setFont('Helvetica-Bold', 6)
c.drawString(8*mm, y, t['from'])

y -= 5*mm
c.setFillColor(colors.HexColor('#1a1916'))
c.setFont('Helvetica-Bold', 9)
c.drawString(8*mm, y, company.get('company_name', ''))

y -= 5*mm
c.setFont('Helvetica', 8)
c.drawString(8*mm, y, company.get('company_address', ''))

y -= 4.5*mm
postcode = (company.get('company_postcode') or '').strip()
city = (company.get('company_city') or '').strip()
if postcode and city:
    c.drawString(8*mm, y, f"{postcode} {city}")
elif postcode or city:
    c.drawString(8*mm, y, postcode or city)

y -= 4.5*mm
c.drawString(8*mm, y, company.get('company_country', ''))

y -= 4.5*mm
c.setFillColor(colors.HexColor('#666666'))
c.setFont('Helvetica', 7)
c.drawString(8*mm, y, company.get('company_phone', ''))
c.drawString(50*mm, y, company.get('company_email', ''))

# Divider between FROM and TO
mid = H / 2
c.setStrokeColor(colors.HexColor('#cccccc'))
c.setLineWidth(0.5)
c.line(8*mm, mid, W - 8*mm, mid)

# TO section
y = mid - 6*mm
c.setFillColor(colors.HexColor('#666666'))
c.setFont('Helvetica-Bold', 6)
c.drawString(8*mm, y, t['to'])

y -= 5*mm
c.setFillColor(colors.HexColor('#1a1916'))
c.setFont('Helvetica-Bold', 11)
c.drawString(8*mm, y, client.get('name', ''))

y -= 5.5*mm
c.setFont('Helvetica', 8)
if client.get('company'):
    c.drawString(8*mm, y, client['company'])
    y -= 4.5*mm

addr = client.get('address', '')
for part in addr.split(','):
    part = part.strip()
    if part:
        c.drawString(8*mm, y, part)
        y -= 4.5*mm

# Add postal code and city if available
postcode = (client.get('postcode') or '').strip()
if postcode:
    c.drawString(8*mm, y, postcode)
    y -= 4.5*mm

c.setFillColor(colors.HexColor('#666666'))
c.setFont('Helvetica', 7)
if client.get('phone'):
    c.drawString(8*mm, y, client['phone'])

# Products box at bottom - adjust height based on number of items
item_count = len(items)
box_y = 8*mm
box_h = 4.5*mm + (item_count * 4*mm)  # Header + items
c.setStrokeColor(colors.HexColor('#1a1916'))
c.setFillColor(colors.HexColor('#f8f8f7'))
c.setLineWidth(0.5)
c.rect(8*mm, box_y, W - 16*mm, box_h, fill=1)

c.setFillColor(colors.HexColor('#666666'))
c.setFont('Helvetica-Bold', 6)
c.drawString(10*mm, box_y + box_h - 3.5*mm, t['product'])

# Draw each item
item_y = box_y + box_h - 7.5*mm
for item in items:
    c.setFillColor(colors.HexColor('#1a1916'))
    c.setFont('Helvetica-Bold', 7)
    c.drawString(10*mm, item_y, (item.get('name', '') or '')[:30])
    
    c.setFont('Helvetica', 6)
    c.setFillColor(colors.HexColor('#666666'))
    sku = item.get('sku', '')
    qty = item.get('qty', '')
    c.drawString(10*mm, item_y - 3*mm, f"{t['sku']}: {sku}  {t['qty']}: {qty}")
    
    item_y -= 4*mm

c.save()
print('OK')
