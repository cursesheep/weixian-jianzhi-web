# -*- coding: utf-8 -*-
"""生成微信可扫的二维码 PNG
用法: python make_qr.py <网址> [输出文件名.png]
"""
import sys
import qrcode

url = sys.argv[1] if len(sys.argv) > 1 else 'https://example.com'
out = sys.argv[2] if len(sys.argv) > 2 else r'D:\国创剪纸\web\二维码.png'

qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=3)
qr.add_data(url)
qr.make(fit=True)
img = qr.make_image(fill_color='#9E2B25', back_color='#FFFDF8')  # 绛红×米白，与界面同色
img.save(out)
print('saved:', out)
print('url:', url)
