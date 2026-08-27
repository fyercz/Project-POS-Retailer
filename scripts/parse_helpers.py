import json
import re

def clean_product_name(raw: str) -> str:
    n = raw.strip()
    # Normalize double spaces and quotes
    n = n.replace('"', '').strip()
    
    # Gramasi & standard units formatting
    n = re.sub(r'(\d+)\s*GR\b', r'\1g', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*G\b', r'\1g', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*ML\b', r'\1ml', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*LMBR\b', r'\1 Lembar', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*LBR\b', r'\1 Lembar', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*PADS\b', r'\1 Pads', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*TBLET\b', r'\1 Tablet', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*TBLT\b', r'\1 Tablet', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*TABLET\b', r'\1 Tablet', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*SCH\b', r'\1 Sachet', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*SCT\b', r'\1 Sachet', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*PCS\b', r'\1 Pcs', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*PC\b', r'\1 Pcs', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*P\b', r'\1 Pcs', n, flags=re.IGNORECASE)
    n = re.sub(r'(\d+)\s*S\b', r'\1s', n, flags=re.IGNORECASE)
    
    # Spelling & typo corrections
    replacements = [
        (r'\bREFFIL\b', 'Refill'),
        (r'\bREFIL\b', 'Refill'),
        (r'\bREFF\b', 'Refill'),
        (r'\bRFL\b', 'Refill'),
        (r'\bEXTRA PDS\b', 'Extra Pedas'),
        (r'\bSBL EXTRA PEDAS\b', 'Sambal Extra Pedas'),
        (r'\bSMBAL AYM GORENG\b', 'Sambal Ayam Goreng'),
        (r'\bAYM\b', 'Ayam'),
        (r'\bBWG\b', 'Bawang'),
        (r'\bBWNG\b', 'Bawang'),
        (r'\bCOFFE\b', 'Coffee'),
        (r'\bBLUBERRY\b', 'Blueberry'),
        (r'\bBLUBERI\b', 'Blueberry'),
        (r'\bBLACBERY\b', 'Blackberry'),
        (r'\bFRUTYROLL\b', 'Fruity Roll'),
        (r'\bMANGGO\b', 'Mango'),
        (r'\bMAGARIN\b', 'Margarin'),
        (r'\bMARGARINE\b', 'Margarin'),
        (r'\bYOGURD\b', 'Yogurt'),
        (r'\bYUGURT\b', 'Yogurt'),
        (r'\bYOGHURT\b', 'Yogurt'),
        (r'\bDOBEL TIP\b', 'Double Tape'),
        (r'\bDOBLE SIDE TAPE\b', 'Double Sided Tape'),
        (r'\bLIQ GLUE\b', 'Liquid Glue'),
        (r'\bSOLASI\b', 'Isolasi'),
        (r'\bSTROBERI\b', 'Strawberry'),
        (r'\bSTROBERY\b', 'Strawberry'),
        (r'\bSTROWBERY\b', 'Strawberry'),
        (r'\bSTROWNERI\b', 'Strawberry'),
        (r'\bSTRWBRY\b', 'Strawberry'),
        (r'\bSTRW\b', 'Strawberry'),
        (r'\bSTRO\b', 'Strawberry'),
        (r'\bCOKLT\b', 'Cokelat'),
        (r'\bCOKLAT\b', 'Cokelat'),
        (r'\bCOKELAT\b', 'Cokelat'),
        (r'\bCHOKLAT\b', 'Cokelat'),
        (r'\bCKLT\b', 'Cokelat'),
        (r'\bVANILA\b', 'Vanilla'),
        (r'\bJEUK\b', 'Jeruk'),
        (r'\bORANG\b', 'Orange'),
        (r'\bSPSIAL\b', 'Spesial'),
        (r'\bROMANTC\b', 'Romantic'),
        (r'\bGRH\b', 'Gurih'),
        (r'\bHAZENUT\b', 'Hazelnut'),
        (r'\bMACHA\b', 'Matcha'),
        (r'\bCHESSE\b', 'Cheese'),
        (r'\bBROW SUGAR\b', 'Brown Sugar'),
        (r'\bMARSMALLOW\b', 'Marshmallow'),
        (r'\bCUSSONS\b', 'Cussons'),
        (r'\bCUSSANS\b', 'Cussons'),
        (r'\bCUSSON\b', 'Cussons'),
        (r'\bCUTTON\b', 'Cotton'),
        (r'\bDEWANATARA\b', 'Dewantara'),
        (r'\bESELON\b', 'Echelon'),
        (r'\bFABER CASTEL\b', 'Faber-Castell'),
        (r'\bFABER CASTELL\b', 'Faber-Castell'),
        (r'\bFRISIANT\b', 'Frisian Flag'),
        (r'\bFRUTI TEA\b', 'Fruit Tea'),
        (r'\bINDOFFOD\b', 'Indofood'),
        (r'\bINDOMI\b', 'Indomie'),
        (r'\bCRANCHOX\b', 'Crunchy'),
        (r'\bCRANC\b', 'Crunch'),
        (r'\bCRANCH\b', 'Crunch'),
        (r'\bSEDAAAP\b', 'Sedaap'),
        (r'\bSINZHUI\b', 'Shinzui'),
        (r'\bSHINZU\'I\b', 'Shinzui'),
        (r'\bNUTRINOOST\b', 'Nutriboost'),
        (r'\bKISPRAY BLUIS\b', 'Kispray Blue'),
        (r'\bKISPRAY SEGERIS\b', 'Kispray Segar'),
        (r'\bKODOMO melon\b', 'Kodomo Melon'),
        (r'\bKODOMO SAMPO\b', 'Kodomo Shampo'),
        (r'\bKODOMO TP\b', 'Kodomo Toothpaste'),
        (r'\bKODOMO PASTA\b', 'Kodomo Pasta Gigi'),
        (r'\bMIGIC\b', 'Magic'),
        (r'\bNYAM NTAM\b', 'Nyam Nyam'),
        (r'\bNYAM NYAMBUBBLE\b', 'Nyam Nyam Bubble'),
        (r'\bROTCO\b', 'Royco'),
        (r'\bSANCKIT\b', 'Snackit'),
        (r'\bSOKLIN\b', 'So Klin'),
        (r'\bSOFFELL\b', 'Soffell'),
        (r'\bSOFFEL\b', 'Soffell'),
        (r'\bSOSOFT\b', 'So Soft'),
        (r'\bT-SOFT\b', 'T-Soft'),
        (r'\bTEXAASS\b', 'Texas'),
        (r'\bTIMTAM\b', 'Tim Tam'),
        (r'\bWAFELLO\b', 'Wafello'),
        (r'\bWAFELO\b', 'Wafello'),
        (r'\bYOYIC\b', 'YoyiC'),
        (r'\bSWIZZ\b', 'Swiss'),
        (r'\bKRUPUK\b', 'Kerupuk'),
        (r'\bKRIZZI\b', 'Krizzi'),
        (r'\bMOKACHINNO\b', 'Mochaccino'),
        (r'\bMOCHACHINO\b', 'Mochaccino'),
        (r'\bCAPPO?CINO\b', 'Cappuccino'),
        (r'\bCHOCOLATE\b', 'Cokelat'),
        (r'\bCHOCO\b', 'Cokelat'),
        (r'\bCHO\b', 'Cokelat'),
    ]
    for pattern, replacement in replacements:
        n = re.sub(pattern, replacement, n, flags=re.IGNORECASE)
    
    # Remove multiple spaces
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def detect_category_id(name: str) -> str:
    l = name.lower()
    if any(k in l for k in ['kecap', 'sambal', 'santan', 'garam', 'bumbu', 'racik', 'masako', 'royco', 'sajiku', 'sasa', 'saori', 'mayumi', 'mayonai', 'terasi', 'gula', 'tepung', 'margarin', 'blue band', 'minyak', 'ajinomoto', 'desaku', 'baking powder', 'soda kue', 'pewarna', 'perisa', 'ovalet']):
        return 'groceries'
    if any(k in l for k in ['mie', 'mi ', 'indomie', 'sedaap', 'sarimi', 'pop mie', 'ramen', 'bihun', 'sarden', 'kornet', 'bubur', 'pasta', 'spageti', 'makaroni', 'bon cabe', 'boncabe']):
        return 'instant'
    if any(k in l for k in ['uht', 'susu', 'milk', 'tea', 'teh', 'kopi', 'coffee', 'caffino', 'aqua', 'ades', 'cleo', 'mineral', 'le minerale', 'pocari', 'fanta', 'coca cola', 'sprite', 'yakult', 'floridina', 'nutrisari', 'pop ice', 'larutan', 'lasegar', 'cimory', 'ultra', 'dancow', 'milo', 'hydro coco', 'good day', 'torabika', 'nescafe', 'pucuk', 'buavita', 'you c', 'air panas', 'tebs', 'choklat', 'milku', 'milkuat', 'greenfields', 'oatside', 'coca-cola']):
        return 'beverages'
    if any(k in l for k in ['wafer', 'biskuit', 'biscuit', 'cookies', 'snack', 'oreo', 'tango', 'roma', 'gery', 'chocolatos', 'nabati', 'nextar', 'better', 'beng beng', 'astor', 'chiki', 'chitato', 'piattos', 'qtela', 'potabee', 'pota bee', 'japota', 'kusuka', 'permen', 'candy', 'yupi', 'mentos', 'kiss', 'foxs', 'blaster', 'aice', 'es krim', 'cokelat', 'delfi', 'popcorn', 'kacang', 'kuaci', 'kerupuk', 'nutrijell', 'nutrijel', 'agar', 'jelly', 'puding', 'pudding', 'nata de coco', 'marshmallow', 'mallow', 'tic tac', 'tic tic', 'twistko', 'oishi', 'french fries', 'sukro', 'chupa']):
        return 'snacks'
    if any(k in l for k in ['roti', 'bread', 'cake', 'sosis', 'bakso', 'nugget', 'salad', 'bluder', 'croissant', 'pia', 'mooncake', 'yoghurt', 'yogurt', 'keju', 'chiller', 'odeng', 'crab stick']):
        return 'fresh'
    if any(k in l for k in ['sabun', 'soap', 'shampoo', 'shampo', 'shm', 'shp', 'pantene', 'sunsilk', 'lifebuoy', 'clear', 'lux', 'giv', 'dettol', 'nuvo', 'shinzui', 'pepsodent', 'ciptadent', 'close up', 'formula', 'sikat gigi', 'pasta gigi', 'baby', 'cussons', 'zwitsal', 'mitu', 'kodomo', 'softex', 'charm', 'laurier', 'protex', 'sweety', 'mamypoko', 'pants', 'popok', 'cotton bud', 'kapas', 'marina', 'citra', 'viva', 'garnier', 'fair', 'glow', 'rexona', 'nivea', 'deodorant', 'deo', 'gillette', 'cukuran', 'head&shoulders', 'rejoice', 'zinc', 'zink', 'biore']):
        return 'personal_care'
    if any(k in l for k in ['so klin', 'soklin', 'rinso', 'daia', 'attack', 'boom', 'molto', 'downy', 'rapika', 'kispray', 'super pell', 'superpel', 'wipol', 'vixal', 'wpc', 'sunlight', 'mama lemon', 'mama lime', 'ekonomi', 'cling', 'bayclin', 'vanish', 'baygon', 'hit', 'vape', 'nomos', 'kapur barus', 'swallow', 'bagus', 'tisu', 'tissue', 'nice', 'paseo', 'jolly', 'tessa', 'multi', 'montiss', 'spons', 'sabut', 'kit', 'carrera', 'korek api', 'korek gas', 'lilin', 'pewangi', 'kamper']):
        return 'home_care'
    return 'home_care'

print("Helper definitions loaded successfully.")
