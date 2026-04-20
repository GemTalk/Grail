! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- html_entities class (Python 'html.entities' module)
expectvalue /Class
doit
module subclass: 'html_entities'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
html_entities comment:
'Python html.entities module.

Character entity references defined in HTML 4 and HTML 5.
See https://docs.python.org/3/library/html.entities.html

Exports:
- name2codepoint: dict mapping HTML4 entity names to Unicode codepoints
- codepoint2name: dict mapping Unicode codepoints to entity names
- entitydefs: dict mapping entity names to character strings
- html5: dict mapping HTML5 entity names to character strings
'
%

expectvalue /Class
doit
html_entities category: 'Modules'
%

! ------------------- Remove existing Python methods from html_entities
expectvalue /Metaclass3
doit
html_entities removeAllMethods: 1.
html_entities class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Accessors'
method: html_entities
name2codepoint
	^ self @env0:at: #name2codepoint
%

category: 'Python-Accessors'
method: html_entities
codepoint2name
	^ self @env0:at: #codepoint2name
%

category: 'Python-Accessors'
method: html_entities
entitydefs
	^ self @env0:at: #entitydefs
%

category: 'Python-Accessors'
method: html_entities
html5
	^ self @env0:at: #html5
%

category: 'Python-Initialization'
method: html_entities
initialize
	self
		initialize_name2codepoint;
		initialize_codepoint2name;
		initialize_entitydefs;
		initialize_html5;
		yourself
%

category: 'Python-Initialization'
method: html_entities
initialize_name2codepoint
	"Build the name2codepoint dictionary (252 HTML4 entities).
	Maps entity name (String) to Unicode codepoint (Integer)."

	| d |
	d := KeyValueDictionary @env0:new.

	"Latin characters"
	d @env0:at: 'AElig' put: 198.
	d @env0:at: 'Aacute' put: 193.
	d @env0:at: 'Acirc' put: 194.
	d @env0:at: 'Agrave' put: 192.
	d @env0:at: 'Aring' put: 197.
	d @env0:at: 'Atilde' put: 195.
	d @env0:at: 'Auml' put: 196.
	d @env0:at: 'Ccedil' put: 199.
	d @env0:at: 'ETH' put: 208.
	d @env0:at: 'Eacute' put: 201.
	d @env0:at: 'Ecirc' put: 202.
	d @env0:at: 'Egrave' put: 200.
	d @env0:at: 'Euml' put: 203.
	d @env0:at: 'Iacute' put: 205.
	d @env0:at: 'Icirc' put: 206.
	d @env0:at: 'Igrave' put: 204.
	d @env0:at: 'Iuml' put: 207.
	d @env0:at: 'Ntilde' put: 209.
	d @env0:at: 'Oacute' put: 211.
	d @env0:at: 'Ocirc' put: 212.
	d @env0:at: 'Ograve' put: 210.
	d @env0:at: 'Oslash' put: 216.
	d @env0:at: 'Otilde' put: 213.
	d @env0:at: 'Ouml' put: 214.
	d @env0:at: 'THORN' put: 222.
	d @env0:at: 'Uacute' put: 218.
	d @env0:at: 'Ucirc' put: 219.
	d @env0:at: 'Ugrave' put: 217.
	d @env0:at: 'Uuml' put: 220.
	d @env0:at: 'Yacute' put: 221.
	d @env0:at: 'aacute' put: 225.
	d @env0:at: 'acirc' put: 226.
	d @env0:at: 'aelig' put: 230.
	d @env0:at: 'agrave' put: 224.
	d @env0:at: 'aring' put: 229.
	d @env0:at: 'atilde' put: 227.
	d @env0:at: 'auml' put: 228.
	d @env0:at: 'ccedil' put: 231.
	d @env0:at: 'eacute' put: 233.
	d @env0:at: 'ecirc' put: 234.
	d @env0:at: 'egrave' put: 232.
	d @env0:at: 'eth' put: 240.
	d @env0:at: 'euml' put: 235.
	d @env0:at: 'iacute' put: 237.
	d @env0:at: 'icirc' put: 238.
	d @env0:at: 'igrave' put: 236.
	d @env0:at: 'iuml' put: 239.
	d @env0:at: 'ntilde' put: 241.
	d @env0:at: 'oacute' put: 243.
	d @env0:at: 'ocirc' put: 244.
	d @env0:at: 'ograve' put: 242.
	d @env0:at: 'oslash' put: 248.
	d @env0:at: 'otilde' put: 245.
	d @env0:at: 'ouml' put: 246.
	d @env0:at: 'szlig' put: 223.
	d @env0:at: 'thorn' put: 254.
	d @env0:at: 'uacute' put: 250.
	d @env0:at: 'ucirc' put: 251.
	d @env0:at: 'ugrave' put: 249.
	d @env0:at: 'uuml' put: 252.
	d @env0:at: 'yacute' put: 253.
	d @env0:at: 'yuml' put: 255.

	"Latin extended and ligatures"
	d @env0:at: 'OElig' put: 338.
	d @env0:at: 'oelig' put: 339.
	d @env0:at: 'Scaron' put: 352.
	d @env0:at: 'scaron' put: 353.
	d @env0:at: 'Yuml' put: 376.
	d @env0:at: 'fnof' put: 402.
	d @env0:at: 'circ' put: 710.
	d @env0:at: 'tilde' put: 732.

	"Greek letters"
	d @env0:at: 'Alpha' put: 913.
	d @env0:at: 'Beta' put: 914.
	d @env0:at: 'Gamma' put: 915.
	d @env0:at: 'Delta' put: 916.
	d @env0:at: 'Epsilon' put: 917.
	d @env0:at: 'Zeta' put: 918.
	d @env0:at: 'Eta' put: 919.
	d @env0:at: 'Theta' put: 920.
	d @env0:at: 'Iota' put: 921.
	d @env0:at: 'Kappa' put: 922.
	d @env0:at: 'Lambda' put: 923.
	d @env0:at: 'Mu' put: 924.
	d @env0:at: 'Nu' put: 925.
	d @env0:at: 'Xi' put: 926.
	d @env0:at: 'Omicron' put: 927.
	d @env0:at: 'Pi' put: 928.
	d @env0:at: 'Rho' put: 929.
	d @env0:at: 'Sigma' put: 931.
	d @env0:at: 'Tau' put: 932.
	d @env0:at: 'Upsilon' put: 933.
	d @env0:at: 'Phi' put: 934.
	d @env0:at: 'Chi' put: 935.
	d @env0:at: 'Psi' put: 936.
	d @env0:at: 'Omega' put: 937.
	d @env0:at: 'alpha' put: 945.
	d @env0:at: 'beta' put: 946.
	d @env0:at: 'gamma' put: 947.
	d @env0:at: 'delta' put: 948.
	d @env0:at: 'epsilon' put: 949.
	d @env0:at: 'zeta' put: 950.
	d @env0:at: 'eta' put: 951.
	d @env0:at: 'theta' put: 952.
	d @env0:at: 'iota' put: 953.
	d @env0:at: 'kappa' put: 954.
	d @env0:at: 'lambda' put: 955.
	d @env0:at: 'mu' put: 956.
	d @env0:at: 'nu' put: 957.
	d @env0:at: 'xi' put: 958.
	d @env0:at: 'omicron' put: 959.
	d @env0:at: 'pi' put: 960.
	d @env0:at: 'rho' put: 961.
	d @env0:at: 'sigmaf' put: 962.
	d @env0:at: 'sigma' put: 963.
	d @env0:at: 'tau' put: 964.
	d @env0:at: 'upsilon' put: 965.
	d @env0:at: 'phi' put: 966.
	d @env0:at: 'chi' put: 967.
	d @env0:at: 'psi' put: 968.
	d @env0:at: 'omega' put: 969.
	d @env0:at: 'thetasym' put: 977.
	d @env0:at: 'upsih' put: 978.
	d @env0:at: 'piv' put: 982.

	"Punctuation and spacing"
	d @env0:at: 'ensp' put: 8194.
	d @env0:at: 'emsp' put: 8195.
	d @env0:at: 'thinsp' put: 8201.
	d @env0:at: 'zwnj' put: 8204.
	d @env0:at: 'zwj' put: 8205.
	d @env0:at: 'lrm' put: 8206.
	d @env0:at: 'rlm' put: 8207.
	d @env0:at: 'ndash' put: 8211.
	d @env0:at: 'mdash' put: 8212.
	d @env0:at: 'lsquo' put: 8216.
	d @env0:at: 'rsquo' put: 8217.
	d @env0:at: 'sbquo' put: 8218.
	d @env0:at: 'ldquo' put: 8220.
	d @env0:at: 'rdquo' put: 8221.
	d @env0:at: 'bdquo' put: 8222.
	d @env0:at: 'dagger' put: 8224.
	d @env0:at: 'Dagger' put: 8225.
	d @env0:at: 'bull' put: 8226.
	d @env0:at: 'hellip' put: 8230.
	d @env0:at: 'permil' put: 8240.
	d @env0:at: 'prime' put: 8242.
	d @env0:at: 'Prime' put: 8243.
	d @env0:at: 'lsaquo' put: 8249.
	d @env0:at: 'rsaquo' put: 8250.
	d @env0:at: 'oline' put: 8254.
	d @env0:at: 'frasl' put: 8260.

	"Currency and symbols"
	d @env0:at: 'euro' put: 8364.
	d @env0:at: 'image' put: 8465.
	d @env0:at: 'weierp' put: 8472.
	d @env0:at: 'real' put: 8476.
	d @env0:at: 'trade' put: 8482.
	d @env0:at: 'alefsym' put: 8501.

	"Arrows"
	d @env0:at: 'larr' put: 8592.
	d @env0:at: 'uarr' put: 8593.
	d @env0:at: 'rarr' put: 8594.
	d @env0:at: 'darr' put: 8595.
	d @env0:at: 'harr' put: 8596.
	d @env0:at: 'crarr' put: 8629.
	d @env0:at: 'lArr' put: 8656.
	d @env0:at: 'uArr' put: 8657.
	d @env0:at: 'rArr' put: 8658.
	d @env0:at: 'dArr' put: 8659.
	d @env0:at: 'hArr' put: 8660.

	"Mathematical operators"
	d @env0:at: 'forall' put: 8704.
	d @env0:at: 'part' put: 8706.
	d @env0:at: 'exist' put: 8707.
	d @env0:at: 'empty' put: 8709.
	d @env0:at: 'nabla' put: 8711.
	d @env0:at: 'isin' put: 8712.
	d @env0:at: 'notin' put: 8713.
	d @env0:at: 'ni' put: 8715.
	d @env0:at: 'prod' put: 8719.
	d @env0:at: 'sum' put: 8721.
	d @env0:at: 'minus' put: 8722.
	d @env0:at: 'lowast' put: 8727.
	d @env0:at: 'radic' put: 8730.
	d @env0:at: 'prop' put: 8733.
	d @env0:at: 'infin' put: 8734.
	d @env0:at: 'ang' put: 8736.
	d @env0:at: 'and' put: 8743.
	d @env0:at: 'or' put: 8744.
	d @env0:at: 'cap' put: 8745.
	d @env0:at: 'cup' put: 8746.
	d @env0:at: 'int' put: 8747.
	d @env0:at: 'there4' put: 8756.
	d @env0:at: 'sim' put: 8764.
	d @env0:at: 'cong' put: 8773.
	d @env0:at: 'asymp' put: 8776.
	d @env0:at: 'ne' put: 8800.
	d @env0:at: 'equiv' put: 8801.
	d @env0:at: 'le' put: 8804.
	d @env0:at: 'ge' put: 8805.
	d @env0:at: 'sub' put: 8834.
	d @env0:at: 'sup' put: 8835.
	d @env0:at: 'nsub' put: 8836.
	d @env0:at: 'sube' put: 8838.
	d @env0:at: 'supe' put: 8839.
	d @env0:at: 'oplus' put: 8853.
	d @env0:at: 'otimes' put: 8855.
	d @env0:at: 'perp' put: 8869.
	d @env0:at: 'sdot' put: 8901.

	"Technical symbols"
	d @env0:at: 'lceil' put: 8968.
	d @env0:at: 'rceil' put: 8969.
	d @env0:at: 'lfloor' put: 8970.
	d @env0:at: 'rfloor' put: 8971.
	d @env0:at: 'lang' put: 9001.
	d @env0:at: 'rang' put: 9002.

	"Geometric shapes and card suits"
	d @env0:at: 'loz' put: 9674.
	d @env0:at: 'spades' put: 9824.
	d @env0:at: 'clubs' put: 9827.
	d @env0:at: 'hearts' put: 9829.
	d @env0:at: 'diams' put: 9830.

	"Basic HTML entities"
	d @env0:at: 'amp' put: 38.
	d @env0:at: 'gt' put: 62.
	d @env0:at: 'lt' put: 60.
	d @env0:at: 'quot' put: 34.
	d @env0:at: 'apos' put: 39.

	"Latin-1 supplement characters"
	d @env0:at: 'nbsp' put: 160.
	d @env0:at: 'iexcl' put: 161.
	d @env0:at: 'cent' put: 162.
	d @env0:at: 'pound' put: 163.
	d @env0:at: 'curren' put: 164.
	d @env0:at: 'yen' put: 165.
	d @env0:at: 'brvbar' put: 166.
	d @env0:at: 'sect' put: 167.
	d @env0:at: 'uml' put: 168.
	d @env0:at: 'copy' put: 169.
	d @env0:at: 'ordf' put: 170.
	d @env0:at: 'laquo' put: 171.
	d @env0:at: 'not' put: 172.
	d @env0:at: 'shy' put: 173.
	d @env0:at: 'reg' put: 174.
	d @env0:at: 'macr' put: 175.
	d @env0:at: 'deg' put: 176.
	d @env0:at: 'plusmn' put: 177.
	d @env0:at: 'sup2' put: 178.
	d @env0:at: 'sup3' put: 179.
	d @env0:at: 'acute' put: 180.
	d @env0:at: 'micro' put: 181.
	d @env0:at: 'para' put: 182.
	d @env0:at: 'middot' put: 183.
	d @env0:at: 'cedil' put: 184.
	d @env0:at: 'sup1' put: 185.
	d @env0:at: 'ordm' put: 186.
	d @env0:at: 'raquo' put: 187.
	d @env0:at: 'frac14' put: 188.
	d @env0:at: 'frac12' put: 189.
	d @env0:at: 'frac34' put: 190.
	d @env0:at: 'iquest' put: 191.
	d @env0:at: 'times' put: 215.
	d @env0:at: 'divide' put: 247.

	self @env0:at: #name2codepoint put: d
%

category: 'Python-Initialization'
method: html_entities
initialize_codepoint2name
	"Build the codepoint2name dictionary (reverse of name2codepoint).
	Maps Unicode codepoint (Integer) to entity name (String)."

	| n2c c2n |
	n2c := self @env0:at: #name2codepoint.
	c2n := KeyValueDictionary @env0:new.
	n2c @env0:keysAndValuesDo: [:name :codepoint |
			c2n @env0:at: codepoint put: name.
		].
	self @env0:at: #codepoint2name put: c2n
%

category: 'Python-Initialization'
method: html_entities
initialize_entitydefs
	"Build the entitydefs dictionary.
	Maps entity name (String) to character string."

	| n2c ed |
	n2c := self @env0:at: #name2codepoint.
	ed := KeyValueDictionary @env0:new.
	n2c @env0:keysAndValuesDo: [:name :codepoint |
			ed @env0:at: name put: (Character @env0:codePoint: codepoint) @env0:asString.
		].
	self @env0:at: #entitydefs put: ed
%


category: 'Python-Initialization'
method: html_entities
initialize_html5
	"Build the html5 dictionary (2125 WHATWG HTML5 entities).
	Maps entity name (String) to character string (String)."

	| d |
	d := KeyValueDictionary @env0:new.

	d @env0:at: 'Aacute' put: (Character @env0:codePoint: 193) @env0:asString.
	d @env0:at: 'aacute' put: (Character @env0:codePoint: 225) @env0:asString.
	d @env0:at: 'Abreve' put: (Character @env0:codePoint: 258) @env0:asString.
	d @env0:at: 'abreve' put: (Character @env0:codePoint: 259) @env0:asString.
	d @env0:at: 'ac' put: (Character @env0:codePoint: 8766) @env0:asString.
	d @env0:at: 'acd' put: (Character @env0:codePoint: 8767) @env0:asString.
	d @env0:at: 'acE' put: ((Character @env0:codePoint: 8766) @env0:asString @env0:, (Character @env0:codePoint: 819) @env0:asString).
	d @env0:at: 'Acirc' put: (Character @env0:codePoint: 194) @env0:asString.
	d @env0:at: 'acirc' put: (Character @env0:codePoint: 226) @env0:asString.
	d @env0:at: 'acute' put: (Character @env0:codePoint: 180) @env0:asString.
	d @env0:at: 'Acy' put: (Character @env0:codePoint: 1040) @env0:asString.
	d @env0:at: 'acy' put: (Character @env0:codePoint: 1072) @env0:asString.
	d @env0:at: 'AElig' put: (Character @env0:codePoint: 198) @env0:asString.
	d @env0:at: 'aelig' put: (Character @env0:codePoint: 230) @env0:asString.
	d @env0:at: 'af' put: (Character @env0:codePoint: 8289) @env0:asString.
	d @env0:at: 'Afr' put: (Character @env0:codePoint: 120068) @env0:asString.
	d @env0:at: 'afr' put: (Character @env0:codePoint: 120094) @env0:asString.
	d @env0:at: 'Agrave' put: (Character @env0:codePoint: 192) @env0:asString.
	d @env0:at: 'agrave' put: (Character @env0:codePoint: 224) @env0:asString.
	d @env0:at: 'alefsym' put: (Character @env0:codePoint: 8501) @env0:asString.
	d @env0:at: 'aleph' put: (Character @env0:codePoint: 8501) @env0:asString.
	d @env0:at: 'Alpha' put: (Character @env0:codePoint: 913) @env0:asString.
	d @env0:at: 'alpha' put: (Character @env0:codePoint: 945) @env0:asString.
	d @env0:at: 'Amacr' put: (Character @env0:codePoint: 256) @env0:asString.
	d @env0:at: 'amacr' put: (Character @env0:codePoint: 257) @env0:asString.
	d @env0:at: 'amalg' put: (Character @env0:codePoint: 10815) @env0:asString.
	d @env0:at: 'AMP' put: (Character @env0:codePoint: 38) @env0:asString.
	d @env0:at: 'amp' put: (Character @env0:codePoint: 38) @env0:asString.
	d @env0:at: 'And' put: (Character @env0:codePoint: 10835) @env0:asString.
	d @env0:at: 'and' put: (Character @env0:codePoint: 8743) @env0:asString.
	d @env0:at: 'andand' put: (Character @env0:codePoint: 10837) @env0:asString.
	d @env0:at: 'andd' put: (Character @env0:codePoint: 10844) @env0:asString.
	d @env0:at: 'andslope' put: (Character @env0:codePoint: 10840) @env0:asString.
	d @env0:at: 'andv' put: (Character @env0:codePoint: 10842) @env0:asString.
	d @env0:at: 'ang' put: (Character @env0:codePoint: 8736) @env0:asString.
	d @env0:at: 'ange' put: (Character @env0:codePoint: 10660) @env0:asString.
	d @env0:at: 'angle' put: (Character @env0:codePoint: 8736) @env0:asString.
	d @env0:at: 'angmsd' put: (Character @env0:codePoint: 8737) @env0:asString.
	d @env0:at: 'angmsdaa' put: (Character @env0:codePoint: 10664) @env0:asString.
	d @env0:at: 'angmsdab' put: (Character @env0:codePoint: 10665) @env0:asString.
	d @env0:at: 'angmsdac' put: (Character @env0:codePoint: 10666) @env0:asString.
	d @env0:at: 'angmsdad' put: (Character @env0:codePoint: 10667) @env0:asString.
	d @env0:at: 'angmsdae' put: (Character @env0:codePoint: 10668) @env0:asString.
	d @env0:at: 'angmsdaf' put: (Character @env0:codePoint: 10669) @env0:asString.
	d @env0:at: 'angmsdag' put: (Character @env0:codePoint: 10670) @env0:asString.
	d @env0:at: 'angmsdah' put: (Character @env0:codePoint: 10671) @env0:asString.
	d @env0:at: 'angrt' put: (Character @env0:codePoint: 8735) @env0:asString.
	d @env0:at: 'angrtvb' put: (Character @env0:codePoint: 8894) @env0:asString.
	d @env0:at: 'angrtvbd' put: (Character @env0:codePoint: 10653) @env0:asString.
	d @env0:at: 'angsph' put: (Character @env0:codePoint: 8738) @env0:asString.
	d @env0:at: 'angst' put: (Character @env0:codePoint: 197) @env0:asString.
	d @env0:at: 'angzarr' put: (Character @env0:codePoint: 9084) @env0:asString.
	d @env0:at: 'Aogon' put: (Character @env0:codePoint: 260) @env0:asString.
	d @env0:at: 'aogon' put: (Character @env0:codePoint: 261) @env0:asString.
	d @env0:at: 'Aopf' put: (Character @env0:codePoint: 120120) @env0:asString.
	d @env0:at: 'aopf' put: (Character @env0:codePoint: 120146) @env0:asString.
	d @env0:at: 'ap' put: (Character @env0:codePoint: 8776) @env0:asString.
	d @env0:at: 'apacir' put: (Character @env0:codePoint: 10863) @env0:asString.
	d @env0:at: 'apE' put: (Character @env0:codePoint: 10864) @env0:asString.
	d @env0:at: 'ape' put: (Character @env0:codePoint: 8778) @env0:asString.
	d @env0:at: 'apid' put: (Character @env0:codePoint: 8779) @env0:asString.
	d @env0:at: 'apos' put: (Character @env0:codePoint: 39) @env0:asString.
	d @env0:at: 'ApplyFunction' put: (Character @env0:codePoint: 8289) @env0:asString.
	d @env0:at: 'approx' put: (Character @env0:codePoint: 8776) @env0:asString.
	d @env0:at: 'approxeq' put: (Character @env0:codePoint: 8778) @env0:asString.
	d @env0:at: 'Aring' put: (Character @env0:codePoint: 197) @env0:asString.
	d @env0:at: 'aring' put: (Character @env0:codePoint: 229) @env0:asString.
	d @env0:at: 'Ascr' put: (Character @env0:codePoint: 119964) @env0:asString.
	d @env0:at: 'ascr' put: (Character @env0:codePoint: 119990) @env0:asString.
	d @env0:at: 'Assign' put: (Character @env0:codePoint: 8788) @env0:asString.
	d @env0:at: 'ast' put: (Character @env0:codePoint: 42) @env0:asString.
	d @env0:at: 'asymp' put: (Character @env0:codePoint: 8776) @env0:asString.
	d @env0:at: 'asympeq' put: (Character @env0:codePoint: 8781) @env0:asString.
	d @env0:at: 'Atilde' put: (Character @env0:codePoint: 195) @env0:asString.
	d @env0:at: 'atilde' put: (Character @env0:codePoint: 227) @env0:asString.
	d @env0:at: 'Auml' put: (Character @env0:codePoint: 196) @env0:asString.
	d @env0:at: 'auml' put: (Character @env0:codePoint: 228) @env0:asString.
	d @env0:at: 'awconint' put: (Character @env0:codePoint: 8755) @env0:asString.
	d @env0:at: 'awint' put: (Character @env0:codePoint: 10769) @env0:asString.
	d @env0:at: 'backcong' put: (Character @env0:codePoint: 8780) @env0:asString.
	d @env0:at: 'backepsilon' put: (Character @env0:codePoint: 1014) @env0:asString.
	d @env0:at: 'backprime' put: (Character @env0:codePoint: 8245) @env0:asString.
	d @env0:at: 'backsim' put: (Character @env0:codePoint: 8765) @env0:asString.
	d @env0:at: 'backsimeq' put: (Character @env0:codePoint: 8909) @env0:asString.
	d @env0:at: 'Backslash' put: (Character @env0:codePoint: 8726) @env0:asString.
	d @env0:at: 'Barv' put: (Character @env0:codePoint: 10983) @env0:asString.
	d @env0:at: 'barvee' put: (Character @env0:codePoint: 8893) @env0:asString.
	d @env0:at: 'Barwed' put: (Character @env0:codePoint: 8966) @env0:asString.
	d @env0:at: 'barwed' put: (Character @env0:codePoint: 8965) @env0:asString.
	d @env0:at: 'barwedge' put: (Character @env0:codePoint: 8965) @env0:asString.
	d @env0:at: 'bbrk' put: (Character @env0:codePoint: 9141) @env0:asString.
	d @env0:at: 'bbrktbrk' put: (Character @env0:codePoint: 9142) @env0:asString.
	d @env0:at: 'bcong' put: (Character @env0:codePoint: 8780) @env0:asString.
	d @env0:at: 'Bcy' put: (Character @env0:codePoint: 1041) @env0:asString.
	d @env0:at: 'bcy' put: (Character @env0:codePoint: 1073) @env0:asString.
	d @env0:at: 'bdquo' put: (Character @env0:codePoint: 8222) @env0:asString.
	d @env0:at: 'becaus' put: (Character @env0:codePoint: 8757) @env0:asString.
	d @env0:at: 'Because' put: (Character @env0:codePoint: 8757) @env0:asString.
	d @env0:at: 'because' put: (Character @env0:codePoint: 8757) @env0:asString.
	d @env0:at: 'bemptyv' put: (Character @env0:codePoint: 10672) @env0:asString.
	d @env0:at: 'bepsi' put: (Character @env0:codePoint: 1014) @env0:asString.
	d @env0:at: 'bernou' put: (Character @env0:codePoint: 8492) @env0:asString.
	d @env0:at: 'Bernoullis' put: (Character @env0:codePoint: 8492) @env0:asString.
	d @env0:at: 'Beta' put: (Character @env0:codePoint: 914) @env0:asString.
	d @env0:at: 'beta' put: (Character @env0:codePoint: 946) @env0:asString.
	d @env0:at: 'beth' put: (Character @env0:codePoint: 8502) @env0:asString.
	d @env0:at: 'between' put: (Character @env0:codePoint: 8812) @env0:asString.
	d @env0:at: 'Bfr' put: (Character @env0:codePoint: 120069) @env0:asString.
	d @env0:at: 'bfr' put: (Character @env0:codePoint: 120095) @env0:asString.
	d @env0:at: 'bigcap' put: (Character @env0:codePoint: 8898) @env0:asString.
	d @env0:at: 'bigcirc' put: (Character @env0:codePoint: 9711) @env0:asString.
	d @env0:at: 'bigcup' put: (Character @env0:codePoint: 8899) @env0:asString.
	d @env0:at: 'bigodot' put: (Character @env0:codePoint: 10752) @env0:asString.
	d @env0:at: 'bigoplus' put: (Character @env0:codePoint: 10753) @env0:asString.
	d @env0:at: 'bigotimes' put: (Character @env0:codePoint: 10754) @env0:asString.
	d @env0:at: 'bigsqcup' put: (Character @env0:codePoint: 10758) @env0:asString.
	d @env0:at: 'bigstar' put: (Character @env0:codePoint: 9733) @env0:asString.
	d @env0:at: 'bigtriangledown' put: (Character @env0:codePoint: 9661) @env0:asString.
	d @env0:at: 'bigtriangleup' put: (Character @env0:codePoint: 9651) @env0:asString.
	d @env0:at: 'biguplus' put: (Character @env0:codePoint: 10756) @env0:asString.
	d @env0:at: 'bigvee' put: (Character @env0:codePoint: 8897) @env0:asString.
	d @env0:at: 'bigwedge' put: (Character @env0:codePoint: 8896) @env0:asString.
	d @env0:at: 'bkarow' put: (Character @env0:codePoint: 10509) @env0:asString.
	d @env0:at: 'blacklozenge' put: (Character @env0:codePoint: 10731) @env0:asString.
	d @env0:at: 'blacksquare' put: (Character @env0:codePoint: 9642) @env0:asString.
	d @env0:at: 'blacktriangle' put: (Character @env0:codePoint: 9652) @env0:asString.
	d @env0:at: 'blacktriangledown' put: (Character @env0:codePoint: 9662) @env0:asString.
	d @env0:at: 'blacktriangleleft' put: (Character @env0:codePoint: 9666) @env0:asString.
	d @env0:at: 'blacktriangleright' put: (Character @env0:codePoint: 9656) @env0:asString.
	d @env0:at: 'blank' put: (Character @env0:codePoint: 9251) @env0:asString.
	d @env0:at: 'blk12' put: (Character @env0:codePoint: 9618) @env0:asString.
	d @env0:at: 'blk14' put: (Character @env0:codePoint: 9617) @env0:asString.
	d @env0:at: 'blk34' put: (Character @env0:codePoint: 9619) @env0:asString.
	d @env0:at: 'block' put: (Character @env0:codePoint: 9608) @env0:asString.
	d @env0:at: 'bne' put: ((Character @env0:codePoint: 61) @env0:asString @env0:, (Character @env0:codePoint: 8421) @env0:asString).
	d @env0:at: 'bnequiv' put: ((Character @env0:codePoint: 8801) @env0:asString @env0:, (Character @env0:codePoint: 8421) @env0:asString).
	d @env0:at: 'bNot' put: (Character @env0:codePoint: 10989) @env0:asString.
	d @env0:at: 'bnot' put: (Character @env0:codePoint: 8976) @env0:asString.
	d @env0:at: 'Bopf' put: (Character @env0:codePoint: 120121) @env0:asString.
	d @env0:at: 'bopf' put: (Character @env0:codePoint: 120147) @env0:asString.
	d @env0:at: 'bot' put: (Character @env0:codePoint: 8869) @env0:asString.
	d @env0:at: 'bottom' put: (Character @env0:codePoint: 8869) @env0:asString.
	d @env0:at: 'bowtie' put: (Character @env0:codePoint: 8904) @env0:asString.
	d @env0:at: 'boxbox' put: (Character @env0:codePoint: 10697) @env0:asString.
	d @env0:at: 'boxDL' put: (Character @env0:codePoint: 9559) @env0:asString.
	d @env0:at: 'boxDl' put: (Character @env0:codePoint: 9558) @env0:asString.
	d @env0:at: 'boxdL' put: (Character @env0:codePoint: 9557) @env0:asString.
	d @env0:at: 'boxdl' put: (Character @env0:codePoint: 9488) @env0:asString.
	d @env0:at: 'boxDR' put: (Character @env0:codePoint: 9556) @env0:asString.
	d @env0:at: 'boxDr' put: (Character @env0:codePoint: 9555) @env0:asString.
	d @env0:at: 'boxdR' put: (Character @env0:codePoint: 9554) @env0:asString.
	d @env0:at: 'boxdr' put: (Character @env0:codePoint: 9484) @env0:asString.
	d @env0:at: 'boxH' put: (Character @env0:codePoint: 9552) @env0:asString.
	d @env0:at: 'boxh' put: (Character @env0:codePoint: 9472) @env0:asString.
	d @env0:at: 'boxHD' put: (Character @env0:codePoint: 9574) @env0:asString.
	d @env0:at: 'boxHd' put: (Character @env0:codePoint: 9572) @env0:asString.
	d @env0:at: 'boxhD' put: (Character @env0:codePoint: 9573) @env0:asString.
	d @env0:at: 'boxhd' put: (Character @env0:codePoint: 9516) @env0:asString.
	d @env0:at: 'boxHU' put: (Character @env0:codePoint: 9577) @env0:asString.
	d @env0:at: 'boxHu' put: (Character @env0:codePoint: 9575) @env0:asString.
	d @env0:at: 'boxhU' put: (Character @env0:codePoint: 9576) @env0:asString.
	d @env0:at: 'boxhu' put: (Character @env0:codePoint: 9524) @env0:asString.
	d @env0:at: 'boxminus' put: (Character @env0:codePoint: 8863) @env0:asString.
	d @env0:at: 'boxplus' put: (Character @env0:codePoint: 8862) @env0:asString.
	d @env0:at: 'boxtimes' put: (Character @env0:codePoint: 8864) @env0:asString.
	d @env0:at: 'boxUL' put: (Character @env0:codePoint: 9565) @env0:asString.
	d @env0:at: 'boxUl' put: (Character @env0:codePoint: 9564) @env0:asString.
	d @env0:at: 'boxuL' put: (Character @env0:codePoint: 9563) @env0:asString.
	d @env0:at: 'boxul' put: (Character @env0:codePoint: 9496) @env0:asString.
	d @env0:at: 'boxUR' put: (Character @env0:codePoint: 9562) @env0:asString.
	d @env0:at: 'boxUr' put: (Character @env0:codePoint: 9561) @env0:asString.
	d @env0:at: 'boxuR' put: (Character @env0:codePoint: 9560) @env0:asString.
	d @env0:at: 'boxur' put: (Character @env0:codePoint: 9492) @env0:asString.
	d @env0:at: 'boxV' put: (Character @env0:codePoint: 9553) @env0:asString.
	d @env0:at: 'boxv' put: (Character @env0:codePoint: 9474) @env0:asString.
	d @env0:at: 'boxVH' put: (Character @env0:codePoint: 9580) @env0:asString.
	d @env0:at: 'boxVh' put: (Character @env0:codePoint: 9579) @env0:asString.
	d @env0:at: 'boxvH' put: (Character @env0:codePoint: 9578) @env0:asString.
	d @env0:at: 'boxvh' put: (Character @env0:codePoint: 9532) @env0:asString.
	d @env0:at: 'boxVL' put: (Character @env0:codePoint: 9571) @env0:asString.
	d @env0:at: 'boxVl' put: (Character @env0:codePoint: 9570) @env0:asString.
	d @env0:at: 'boxvL' put: (Character @env0:codePoint: 9569) @env0:asString.
	d @env0:at: 'boxvl' put: (Character @env0:codePoint: 9508) @env0:asString.
	d @env0:at: 'boxVR' put: (Character @env0:codePoint: 9568) @env0:asString.
	d @env0:at: 'boxVr' put: (Character @env0:codePoint: 9567) @env0:asString.
	d @env0:at: 'boxvR' put: (Character @env0:codePoint: 9566) @env0:asString.
	d @env0:at: 'boxvr' put: (Character @env0:codePoint: 9500) @env0:asString.
	d @env0:at: 'bprime' put: (Character @env0:codePoint: 8245) @env0:asString.
	d @env0:at: 'Breve' put: (Character @env0:codePoint: 728) @env0:asString.
	d @env0:at: 'breve' put: (Character @env0:codePoint: 728) @env0:asString.
	d @env0:at: 'brvbar' put: (Character @env0:codePoint: 166) @env0:asString.
	d @env0:at: 'Bscr' put: (Character @env0:codePoint: 8492) @env0:asString.
	d @env0:at: 'bscr' put: (Character @env0:codePoint: 119991) @env0:asString.
	d @env0:at: 'bsemi' put: (Character @env0:codePoint: 8271) @env0:asString.
	d @env0:at: 'bsim' put: (Character @env0:codePoint: 8765) @env0:asString.
	d @env0:at: 'bsime' put: (Character @env0:codePoint: 8909) @env0:asString.
	d @env0:at: 'bsol' put: (Character @env0:codePoint: 92) @env0:asString.
	d @env0:at: 'bsolb' put: (Character @env0:codePoint: 10693) @env0:asString.
	d @env0:at: 'bsolhsub' put: (Character @env0:codePoint: 10184) @env0:asString.
	d @env0:at: 'bull' put: (Character @env0:codePoint: 8226) @env0:asString.
	d @env0:at: 'bullet' put: (Character @env0:codePoint: 8226) @env0:asString.
	d @env0:at: 'bump' put: (Character @env0:codePoint: 8782) @env0:asString.
	d @env0:at: 'bumpE' put: (Character @env0:codePoint: 10926) @env0:asString.
	d @env0:at: 'bumpe' put: (Character @env0:codePoint: 8783) @env0:asString.
	d @env0:at: 'Bumpeq' put: (Character @env0:codePoint: 8782) @env0:asString.
	d @env0:at: 'bumpeq' put: (Character @env0:codePoint: 8783) @env0:asString.
	d @env0:at: 'Cacute' put: (Character @env0:codePoint: 262) @env0:asString.
	d @env0:at: 'cacute' put: (Character @env0:codePoint: 263) @env0:asString.
	d @env0:at: 'Cap' put: (Character @env0:codePoint: 8914) @env0:asString.
	d @env0:at: 'cap' put: (Character @env0:codePoint: 8745) @env0:asString.
	d @env0:at: 'capand' put: (Character @env0:codePoint: 10820) @env0:asString.
	d @env0:at: 'capbrcup' put: (Character @env0:codePoint: 10825) @env0:asString.
	d @env0:at: 'capcap' put: (Character @env0:codePoint: 10827) @env0:asString.
	d @env0:at: 'capcup' put: (Character @env0:codePoint: 10823) @env0:asString.
	d @env0:at: 'capdot' put: (Character @env0:codePoint: 10816) @env0:asString.
	d @env0:at: 'CapitalDifferentialD' put: (Character @env0:codePoint: 8517) @env0:asString.
	d @env0:at: 'caps' put: ((Character @env0:codePoint: 8745) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'caret' put: (Character @env0:codePoint: 8257) @env0:asString.
	d @env0:at: 'caron' put: (Character @env0:codePoint: 711) @env0:asString.
	d @env0:at: 'Cayleys' put: (Character @env0:codePoint: 8493) @env0:asString.
	d @env0:at: 'ccaps' put: (Character @env0:codePoint: 10829) @env0:asString.
	d @env0:at: 'Ccaron' put: (Character @env0:codePoint: 268) @env0:asString.
	d @env0:at: 'ccaron' put: (Character @env0:codePoint: 269) @env0:asString.
	d @env0:at: 'Ccedil' put: (Character @env0:codePoint: 199) @env0:asString.
	d @env0:at: 'ccedil' put: (Character @env0:codePoint: 231) @env0:asString.
	d @env0:at: 'Ccirc' put: (Character @env0:codePoint: 264) @env0:asString.
	d @env0:at: 'ccirc' put: (Character @env0:codePoint: 265) @env0:asString.
	d @env0:at: 'Cconint' put: (Character @env0:codePoint: 8752) @env0:asString.
	d @env0:at: 'ccups' put: (Character @env0:codePoint: 10828) @env0:asString.
	d @env0:at: 'ccupssm' put: (Character @env0:codePoint: 10832) @env0:asString.
	d @env0:at: 'Cdot' put: (Character @env0:codePoint: 266) @env0:asString.
	d @env0:at: 'cdot' put: (Character @env0:codePoint: 267) @env0:asString.
	d @env0:at: 'cedil' put: (Character @env0:codePoint: 184) @env0:asString.
	d @env0:at: 'Cedilla' put: (Character @env0:codePoint: 184) @env0:asString.
	d @env0:at: 'cemptyv' put: (Character @env0:codePoint: 10674) @env0:asString.
	d @env0:at: 'cent' put: (Character @env0:codePoint: 162) @env0:asString.
	d @env0:at: 'CenterDot' put: (Character @env0:codePoint: 183) @env0:asString.
	d @env0:at: 'centerdot' put: (Character @env0:codePoint: 183) @env0:asString.
	d @env0:at: 'Cfr' put: (Character @env0:codePoint: 8493) @env0:asString.
	d @env0:at: 'cfr' put: (Character @env0:codePoint: 120096) @env0:asString.
	d @env0:at: 'CHcy' put: (Character @env0:codePoint: 1063) @env0:asString.
	d @env0:at: 'chcy' put: (Character @env0:codePoint: 1095) @env0:asString.
	d @env0:at: 'check' put: (Character @env0:codePoint: 10003) @env0:asString.
	d @env0:at: 'checkmark' put: (Character @env0:codePoint: 10003) @env0:asString.
	d @env0:at: 'Chi' put: (Character @env0:codePoint: 935) @env0:asString.
	d @env0:at: 'chi' put: (Character @env0:codePoint: 967) @env0:asString.
	d @env0:at: 'cir' put: (Character @env0:codePoint: 9675) @env0:asString.
	d @env0:at: 'circ' put: (Character @env0:codePoint: 710) @env0:asString.
	d @env0:at: 'circeq' put: (Character @env0:codePoint: 8791) @env0:asString.
	d @env0:at: 'circlearrowleft' put: (Character @env0:codePoint: 8634) @env0:asString.
	d @env0:at: 'circlearrowright' put: (Character @env0:codePoint: 8635) @env0:asString.
	d @env0:at: 'circledast' put: (Character @env0:codePoint: 8859) @env0:asString.
	d @env0:at: 'circledcirc' put: (Character @env0:codePoint: 8858) @env0:asString.
	d @env0:at: 'circleddash' put: (Character @env0:codePoint: 8861) @env0:asString.
	d @env0:at: 'CircleDot' put: (Character @env0:codePoint: 8857) @env0:asString.
	d @env0:at: 'circledR' put: (Character @env0:codePoint: 174) @env0:asString.
	d @env0:at: 'circledS' put: (Character @env0:codePoint: 9416) @env0:asString.
	d @env0:at: 'CircleMinus' put: (Character @env0:codePoint: 8854) @env0:asString.
	d @env0:at: 'CirclePlus' put: (Character @env0:codePoint: 8853) @env0:asString.
	d @env0:at: 'CircleTimes' put: (Character @env0:codePoint: 8855) @env0:asString.
	d @env0:at: 'cirE' put: (Character @env0:codePoint: 10691) @env0:asString.
	d @env0:at: 'cire' put: (Character @env0:codePoint: 8791) @env0:asString.
	d @env0:at: 'cirfnint' put: (Character @env0:codePoint: 10768) @env0:asString.
	d @env0:at: 'cirmid' put: (Character @env0:codePoint: 10991) @env0:asString.
	d @env0:at: 'cirscir' put: (Character @env0:codePoint: 10690) @env0:asString.
	d @env0:at: 'ClockwiseContourIntegral' put: (Character @env0:codePoint: 8754) @env0:asString.
	d @env0:at: 'CloseCurlyDoubleQuote' put: (Character @env0:codePoint: 8221) @env0:asString.
	d @env0:at: 'CloseCurlyQuote' put: (Character @env0:codePoint: 8217) @env0:asString.
	d @env0:at: 'clubs' put: (Character @env0:codePoint: 9827) @env0:asString.
	d @env0:at: 'clubsuit' put: (Character @env0:codePoint: 9827) @env0:asString.
	d @env0:at: 'Colon' put: (Character @env0:codePoint: 8759) @env0:asString.
	d @env0:at: 'colon' put: (Character @env0:codePoint: 58) @env0:asString.
	d @env0:at: 'Colone' put: (Character @env0:codePoint: 10868) @env0:asString.
	d @env0:at: 'colone' put: (Character @env0:codePoint: 8788) @env0:asString.
	d @env0:at: 'coloneq' put: (Character @env0:codePoint: 8788) @env0:asString.
	d @env0:at: 'comma' put: (Character @env0:codePoint: 44) @env0:asString.
	d @env0:at: 'commat' put: (Character @env0:codePoint: 64) @env0:asString.
	d @env0:at: 'comp' put: (Character @env0:codePoint: 8705) @env0:asString.
	d @env0:at: 'compfn' put: (Character @env0:codePoint: 8728) @env0:asString.
	d @env0:at: 'complement' put: (Character @env0:codePoint: 8705) @env0:asString.
	d @env0:at: 'complexes' put: (Character @env0:codePoint: 8450) @env0:asString.
	d @env0:at: 'cong' put: (Character @env0:codePoint: 8773) @env0:asString.
	d @env0:at: 'congdot' put: (Character @env0:codePoint: 10861) @env0:asString.
	d @env0:at: 'Congruent' put: (Character @env0:codePoint: 8801) @env0:asString.
	d @env0:at: 'Conint' put: (Character @env0:codePoint: 8751) @env0:asString.
	d @env0:at: 'conint' put: (Character @env0:codePoint: 8750) @env0:asString.
	d @env0:at: 'ContourIntegral' put: (Character @env0:codePoint: 8750) @env0:asString.
	d @env0:at: 'Copf' put: (Character @env0:codePoint: 8450) @env0:asString.
	d @env0:at: 'copf' put: (Character @env0:codePoint: 120148) @env0:asString.
	d @env0:at: 'coprod' put: (Character @env0:codePoint: 8720) @env0:asString.
	d @env0:at: 'Coproduct' put: (Character @env0:codePoint: 8720) @env0:asString.
	d @env0:at: 'COPY' put: (Character @env0:codePoint: 169) @env0:asString.
	d @env0:at: 'copy' put: (Character @env0:codePoint: 169) @env0:asString.
	d @env0:at: 'copysr' put: (Character @env0:codePoint: 8471) @env0:asString.
	d @env0:at: 'CounterClockwiseContourIntegral' put: (Character @env0:codePoint: 8755) @env0:asString.
	d @env0:at: 'crarr' put: (Character @env0:codePoint: 8629) @env0:asString.
	d @env0:at: 'Cross' put: (Character @env0:codePoint: 10799) @env0:asString.
	d @env0:at: 'cross' put: (Character @env0:codePoint: 10007) @env0:asString.
	d @env0:at: 'Cscr' put: (Character @env0:codePoint: 119966) @env0:asString.
	d @env0:at: 'cscr' put: (Character @env0:codePoint: 119992) @env0:asString.
	d @env0:at: 'csub' put: (Character @env0:codePoint: 10959) @env0:asString.
	d @env0:at: 'csube' put: (Character @env0:codePoint: 10961) @env0:asString.
	d @env0:at: 'csup' put: (Character @env0:codePoint: 10960) @env0:asString.
	d @env0:at: 'csupe' put: (Character @env0:codePoint: 10962) @env0:asString.
	d @env0:at: 'ctdot' put: (Character @env0:codePoint: 8943) @env0:asString.
	d @env0:at: 'cudarrl' put: (Character @env0:codePoint: 10552) @env0:asString.
	d @env0:at: 'cudarrr' put: (Character @env0:codePoint: 10549) @env0:asString.
	d @env0:at: 'cuepr' put: (Character @env0:codePoint: 8926) @env0:asString.
	d @env0:at: 'cuesc' put: (Character @env0:codePoint: 8927) @env0:asString.
	d @env0:at: 'cularr' put: (Character @env0:codePoint: 8630) @env0:asString.
	d @env0:at: 'cularrp' put: (Character @env0:codePoint: 10557) @env0:asString.
	d @env0:at: 'Cup' put: (Character @env0:codePoint: 8915) @env0:asString.
	d @env0:at: 'cup' put: (Character @env0:codePoint: 8746) @env0:asString.
	d @env0:at: 'cupbrcap' put: (Character @env0:codePoint: 10824) @env0:asString.
	d @env0:at: 'CupCap' put: (Character @env0:codePoint: 8781) @env0:asString.
	d @env0:at: 'cupcap' put: (Character @env0:codePoint: 10822) @env0:asString.
	d @env0:at: 'cupcup' put: (Character @env0:codePoint: 10826) @env0:asString.
	d @env0:at: 'cupdot' put: (Character @env0:codePoint: 8845) @env0:asString.
	d @env0:at: 'cupor' put: (Character @env0:codePoint: 10821) @env0:asString.
	d @env0:at: 'cups' put: ((Character @env0:codePoint: 8746) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'curarr' put: (Character @env0:codePoint: 8631) @env0:asString.
	d @env0:at: 'curarrm' put: (Character @env0:codePoint: 10556) @env0:asString.
	d @env0:at: 'curlyeqprec' put: (Character @env0:codePoint: 8926) @env0:asString.
	d @env0:at: 'curlyeqsucc' put: (Character @env0:codePoint: 8927) @env0:asString.
	d @env0:at: 'curlyvee' put: (Character @env0:codePoint: 8910) @env0:asString.
	d @env0:at: 'curlywedge' put: (Character @env0:codePoint: 8911) @env0:asString.
	d @env0:at: 'curren' put: (Character @env0:codePoint: 164) @env0:asString.
	d @env0:at: 'curvearrowleft' put: (Character @env0:codePoint: 8630) @env0:asString.
	d @env0:at: 'curvearrowright' put: (Character @env0:codePoint: 8631) @env0:asString.
	d @env0:at: 'cuvee' put: (Character @env0:codePoint: 8910) @env0:asString.
	d @env0:at: 'cuwed' put: (Character @env0:codePoint: 8911) @env0:asString.
	d @env0:at: 'cwconint' put: (Character @env0:codePoint: 8754) @env0:asString.
	d @env0:at: 'cwint' put: (Character @env0:codePoint: 8753) @env0:asString.
	d @env0:at: 'cylcty' put: (Character @env0:codePoint: 9005) @env0:asString.
	d @env0:at: 'Dagger' put: (Character @env0:codePoint: 8225) @env0:asString.
	d @env0:at: 'dagger' put: (Character @env0:codePoint: 8224) @env0:asString.
	d @env0:at: 'daleth' put: (Character @env0:codePoint: 8504) @env0:asString.
	d @env0:at: 'Darr' put: (Character @env0:codePoint: 8609) @env0:asString.
	d @env0:at: 'dArr' put: (Character @env0:codePoint: 8659) @env0:asString.
	d @env0:at: 'darr' put: (Character @env0:codePoint: 8595) @env0:asString.
	d @env0:at: 'dash' put: (Character @env0:codePoint: 8208) @env0:asString.
	d @env0:at: 'Dashv' put: (Character @env0:codePoint: 10980) @env0:asString.
	d @env0:at: 'dashv' put: (Character @env0:codePoint: 8867) @env0:asString.
	d @env0:at: 'dbkarow' put: (Character @env0:codePoint: 10511) @env0:asString.
	d @env0:at: 'dblac' put: (Character @env0:codePoint: 733) @env0:asString.
	d @env0:at: 'Dcaron' put: (Character @env0:codePoint: 270) @env0:asString.
	d @env0:at: 'dcaron' put: (Character @env0:codePoint: 271) @env0:asString.
	d @env0:at: 'Dcy' put: (Character @env0:codePoint: 1044) @env0:asString.
	d @env0:at: 'dcy' put: (Character @env0:codePoint: 1076) @env0:asString.
	d @env0:at: 'DD' put: (Character @env0:codePoint: 8517) @env0:asString.
	d @env0:at: 'dd' put: (Character @env0:codePoint: 8518) @env0:asString.
	d @env0:at: 'ddagger' put: (Character @env0:codePoint: 8225) @env0:asString.
	d @env0:at: 'ddarr' put: (Character @env0:codePoint: 8650) @env0:asString.
	d @env0:at: 'DDotrahd' put: (Character @env0:codePoint: 10513) @env0:asString.
	d @env0:at: 'ddotseq' put: (Character @env0:codePoint: 10871) @env0:asString.
	d @env0:at: 'deg' put: (Character @env0:codePoint: 176) @env0:asString.
	d @env0:at: 'Del' put: (Character @env0:codePoint: 8711) @env0:asString.
	d @env0:at: 'Delta' put: (Character @env0:codePoint: 916) @env0:asString.
	d @env0:at: 'delta' put: (Character @env0:codePoint: 948) @env0:asString.
	d @env0:at: 'demptyv' put: (Character @env0:codePoint: 10673) @env0:asString.
	d @env0:at: 'dfisht' put: (Character @env0:codePoint: 10623) @env0:asString.
	d @env0:at: 'Dfr' put: (Character @env0:codePoint: 120071) @env0:asString.
	d @env0:at: 'dfr' put: (Character @env0:codePoint: 120097) @env0:asString.
	d @env0:at: 'dHar' put: (Character @env0:codePoint: 10597) @env0:asString.
	d @env0:at: 'dharl' put: (Character @env0:codePoint: 8643) @env0:asString.
	d @env0:at: 'dharr' put: (Character @env0:codePoint: 8642) @env0:asString.
	d @env0:at: 'DiacriticalAcute' put: (Character @env0:codePoint: 180) @env0:asString.
	d @env0:at: 'DiacriticalDot' put: (Character @env0:codePoint: 729) @env0:asString.
	d @env0:at: 'DiacriticalDoubleAcute' put: (Character @env0:codePoint: 733) @env0:asString.
	d @env0:at: 'DiacriticalGrave' put: (Character @env0:codePoint: 96) @env0:asString.
	d @env0:at: 'DiacriticalTilde' put: (Character @env0:codePoint: 732) @env0:asString.
	d @env0:at: 'diam' put: (Character @env0:codePoint: 8900) @env0:asString.
	d @env0:at: 'Diamond' put: (Character @env0:codePoint: 8900) @env0:asString.
	d @env0:at: 'diamond' put: (Character @env0:codePoint: 8900) @env0:asString.
	d @env0:at: 'diamondsuit' put: (Character @env0:codePoint: 9830) @env0:asString.
	d @env0:at: 'diams' put: (Character @env0:codePoint: 9830) @env0:asString.
	d @env0:at: 'die' put: (Character @env0:codePoint: 168) @env0:asString.
	d @env0:at: 'DifferentialD' put: (Character @env0:codePoint: 8518) @env0:asString.
	d @env0:at: 'digamma' put: (Character @env0:codePoint: 989) @env0:asString.
	d @env0:at: 'disin' put: (Character @env0:codePoint: 8946) @env0:asString.
	d @env0:at: 'div' put: (Character @env0:codePoint: 247) @env0:asString.
	d @env0:at: 'divide' put: (Character @env0:codePoint: 247) @env0:asString.
	d @env0:at: 'divideontimes' put: (Character @env0:codePoint: 8903) @env0:asString.
	d @env0:at: 'divonx' put: (Character @env0:codePoint: 8903) @env0:asString.
	d @env0:at: 'DJcy' put: (Character @env0:codePoint: 1026) @env0:asString.
	d @env0:at: 'djcy' put: (Character @env0:codePoint: 1106) @env0:asString.
	d @env0:at: 'dlcorn' put: (Character @env0:codePoint: 8990) @env0:asString.
	d @env0:at: 'dlcrop' put: (Character @env0:codePoint: 8973) @env0:asString.
	d @env0:at: 'dollar' put: (Character @env0:codePoint: 36) @env0:asString.
	d @env0:at: 'Dopf' put: (Character @env0:codePoint: 120123) @env0:asString.
	d @env0:at: 'dopf' put: (Character @env0:codePoint: 120149) @env0:asString.
	d @env0:at: 'Dot' put: (Character @env0:codePoint: 168) @env0:asString.
	d @env0:at: 'dot' put: (Character @env0:codePoint: 729) @env0:asString.
	d @env0:at: 'DotDot' put: (Character @env0:codePoint: 8412) @env0:asString.
	d @env0:at: 'doteq' put: (Character @env0:codePoint: 8784) @env0:asString.
	d @env0:at: 'doteqdot' put: (Character @env0:codePoint: 8785) @env0:asString.
	d @env0:at: 'DotEqual' put: (Character @env0:codePoint: 8784) @env0:asString.
	d @env0:at: 'dotminus' put: (Character @env0:codePoint: 8760) @env0:asString.
	d @env0:at: 'dotplus' put: (Character @env0:codePoint: 8724) @env0:asString.
	d @env0:at: 'dotsquare' put: (Character @env0:codePoint: 8865) @env0:asString.
	d @env0:at: 'doublebarwedge' put: (Character @env0:codePoint: 8966) @env0:asString.
	d @env0:at: 'DoubleContourIntegral' put: (Character @env0:codePoint: 8751) @env0:asString.
	d @env0:at: 'DoubleDot' put: (Character @env0:codePoint: 168) @env0:asString.
	d @env0:at: 'DoubleDownArrow' put: (Character @env0:codePoint: 8659) @env0:asString.
	d @env0:at: 'DoubleLeftArrow' put: (Character @env0:codePoint: 8656) @env0:asString.
	d @env0:at: 'DoubleLeftRightArrow' put: (Character @env0:codePoint: 8660) @env0:asString.
	d @env0:at: 'DoubleLeftTee' put: (Character @env0:codePoint: 10980) @env0:asString.
	d @env0:at: 'DoubleLongLeftArrow' put: (Character @env0:codePoint: 10232) @env0:asString.
	d @env0:at: 'DoubleLongLeftRightArrow' put: (Character @env0:codePoint: 10234) @env0:asString.
	d @env0:at: 'DoubleLongRightArrow' put: (Character @env0:codePoint: 10233) @env0:asString.
	d @env0:at: 'DoubleRightArrow' put: (Character @env0:codePoint: 8658) @env0:asString.
	d @env0:at: 'DoubleRightTee' put: (Character @env0:codePoint: 8872) @env0:asString.
	d @env0:at: 'DoubleUpArrow' put: (Character @env0:codePoint: 8657) @env0:asString.
	d @env0:at: 'DoubleUpDownArrow' put: (Character @env0:codePoint: 8661) @env0:asString.
	d @env0:at: 'DoubleVerticalBar' put: (Character @env0:codePoint: 8741) @env0:asString.
	d @env0:at: 'DownArrow' put: (Character @env0:codePoint: 8595) @env0:asString.
	d @env0:at: 'Downarrow' put: (Character @env0:codePoint: 8659) @env0:asString.
	d @env0:at: 'downarrow' put: (Character @env0:codePoint: 8595) @env0:asString.
	d @env0:at: 'DownArrowBar' put: (Character @env0:codePoint: 10515) @env0:asString.
	d @env0:at: 'DownArrowUpArrow' put: (Character @env0:codePoint: 8693) @env0:asString.
	d @env0:at: 'DownBreve' put: (Character @env0:codePoint: 785) @env0:asString.
	d @env0:at: 'downdownarrows' put: (Character @env0:codePoint: 8650) @env0:asString.
	d @env0:at: 'downharpoonleft' put: (Character @env0:codePoint: 8643) @env0:asString.
	d @env0:at: 'downharpoonright' put: (Character @env0:codePoint: 8642) @env0:asString.
	d @env0:at: 'DownLeftRightVector' put: (Character @env0:codePoint: 10576) @env0:asString.
	d @env0:at: 'DownLeftTeeVector' put: (Character @env0:codePoint: 10590) @env0:asString.
	d @env0:at: 'DownLeftVector' put: (Character @env0:codePoint: 8637) @env0:asString.
	d @env0:at: 'DownLeftVectorBar' put: (Character @env0:codePoint: 10582) @env0:asString.
	d @env0:at: 'DownRightTeeVector' put: (Character @env0:codePoint: 10591) @env0:asString.
	d @env0:at: 'DownRightVector' put: (Character @env0:codePoint: 8641) @env0:asString.
	d @env0:at: 'DownRightVectorBar' put: (Character @env0:codePoint: 10583) @env0:asString.
	d @env0:at: 'DownTee' put: (Character @env0:codePoint: 8868) @env0:asString.
	d @env0:at: 'DownTeeArrow' put: (Character @env0:codePoint: 8615) @env0:asString.
	d @env0:at: 'drbkarow' put: (Character @env0:codePoint: 10512) @env0:asString.
	d @env0:at: 'drcorn' put: (Character @env0:codePoint: 8991) @env0:asString.
	d @env0:at: 'drcrop' put: (Character @env0:codePoint: 8972) @env0:asString.
	d @env0:at: 'Dscr' put: (Character @env0:codePoint: 119967) @env0:asString.
	d @env0:at: 'dscr' put: (Character @env0:codePoint: 119993) @env0:asString.
	d @env0:at: 'DScy' put: (Character @env0:codePoint: 1029) @env0:asString.
	d @env0:at: 'dscy' put: (Character @env0:codePoint: 1109) @env0:asString.
	d @env0:at: 'dsol' put: (Character @env0:codePoint: 10742) @env0:asString.
	d @env0:at: 'Dstrok' put: (Character @env0:codePoint: 272) @env0:asString.
	d @env0:at: 'dstrok' put: (Character @env0:codePoint: 273) @env0:asString.
	d @env0:at: 'dtdot' put: (Character @env0:codePoint: 8945) @env0:asString.
	d @env0:at: 'dtri' put: (Character @env0:codePoint: 9663) @env0:asString.
	d @env0:at: 'dtrif' put: (Character @env0:codePoint: 9662) @env0:asString.
	d @env0:at: 'duarr' put: (Character @env0:codePoint: 8693) @env0:asString.
	d @env0:at: 'duhar' put: (Character @env0:codePoint: 10607) @env0:asString.
	d @env0:at: 'dwangle' put: (Character @env0:codePoint: 10662) @env0:asString.
	d @env0:at: 'DZcy' put: (Character @env0:codePoint: 1039) @env0:asString.
	d @env0:at: 'dzcy' put: (Character @env0:codePoint: 1119) @env0:asString.
	d @env0:at: 'dzigrarr' put: (Character @env0:codePoint: 10239) @env0:asString.
	d @env0:at: 'Eacute' put: (Character @env0:codePoint: 201) @env0:asString.
	d @env0:at: 'eacute' put: (Character @env0:codePoint: 233) @env0:asString.
	d @env0:at: 'easter' put: (Character @env0:codePoint: 10862) @env0:asString.
	d @env0:at: 'Ecaron' put: (Character @env0:codePoint: 282) @env0:asString.
	d @env0:at: 'ecaron' put: (Character @env0:codePoint: 283) @env0:asString.
	d @env0:at: 'ecir' put: (Character @env0:codePoint: 8790) @env0:asString.
	d @env0:at: 'Ecirc' put: (Character @env0:codePoint: 202) @env0:asString.
	d @env0:at: 'ecirc' put: (Character @env0:codePoint: 234) @env0:asString.
	d @env0:at: 'ecolon' put: (Character @env0:codePoint: 8789) @env0:asString.
	d @env0:at: 'Ecy' put: (Character @env0:codePoint: 1069) @env0:asString.
	d @env0:at: 'ecy' put: (Character @env0:codePoint: 1101) @env0:asString.
	d @env0:at: 'eDDot' put: (Character @env0:codePoint: 10871) @env0:asString.
	d @env0:at: 'Edot' put: (Character @env0:codePoint: 278) @env0:asString.
	d @env0:at: 'eDot' put: (Character @env0:codePoint: 8785) @env0:asString.
	d @env0:at: 'edot' put: (Character @env0:codePoint: 279) @env0:asString.
	d @env0:at: 'ee' put: (Character @env0:codePoint: 8519) @env0:asString.
	d @env0:at: 'efDot' put: (Character @env0:codePoint: 8786) @env0:asString.
	d @env0:at: 'Efr' put: (Character @env0:codePoint: 120072) @env0:asString.
	d @env0:at: 'efr' put: (Character @env0:codePoint: 120098) @env0:asString.
	d @env0:at: 'eg' put: (Character @env0:codePoint: 10906) @env0:asString.
	d @env0:at: 'Egrave' put: (Character @env0:codePoint: 200) @env0:asString.
	d @env0:at: 'egrave' put: (Character @env0:codePoint: 232) @env0:asString.
	d @env0:at: 'egs' put: (Character @env0:codePoint: 10902) @env0:asString.
	d @env0:at: 'egsdot' put: (Character @env0:codePoint: 10904) @env0:asString.
	d @env0:at: 'el' put: (Character @env0:codePoint: 10905) @env0:asString.
	d @env0:at: 'Element' put: (Character @env0:codePoint: 8712) @env0:asString.
	d @env0:at: 'elinters' put: (Character @env0:codePoint: 9191) @env0:asString.
	d @env0:at: 'ell' put: (Character @env0:codePoint: 8467) @env0:asString.
	d @env0:at: 'els' put: (Character @env0:codePoint: 10901) @env0:asString.
	d @env0:at: 'elsdot' put: (Character @env0:codePoint: 10903) @env0:asString.
	d @env0:at: 'Emacr' put: (Character @env0:codePoint: 274) @env0:asString.
	d @env0:at: 'emacr' put: (Character @env0:codePoint: 275) @env0:asString.
	d @env0:at: 'empty' put: (Character @env0:codePoint: 8709) @env0:asString.
	d @env0:at: 'emptyset' put: (Character @env0:codePoint: 8709) @env0:asString.
	d @env0:at: 'EmptySmallSquare' put: (Character @env0:codePoint: 9723) @env0:asString.
	d @env0:at: 'emptyv' put: (Character @env0:codePoint: 8709) @env0:asString.
	d @env0:at: 'EmptyVerySmallSquare' put: (Character @env0:codePoint: 9643) @env0:asString.
	d @env0:at: 'emsp13' put: (Character @env0:codePoint: 8196) @env0:asString.
	d @env0:at: 'emsp14' put: (Character @env0:codePoint: 8197) @env0:asString.
	d @env0:at: 'emsp' put: (Character @env0:codePoint: 8195) @env0:asString.
	d @env0:at: 'ENG' put: (Character @env0:codePoint: 330) @env0:asString.
	d @env0:at: 'eng' put: (Character @env0:codePoint: 331) @env0:asString.
	d @env0:at: 'ensp' put: (Character @env0:codePoint: 8194) @env0:asString.
	d @env0:at: 'Eogon' put: (Character @env0:codePoint: 280) @env0:asString.
	d @env0:at: 'eogon' put: (Character @env0:codePoint: 281) @env0:asString.
	d @env0:at: 'Eopf' put: (Character @env0:codePoint: 120124) @env0:asString.
	d @env0:at: 'eopf' put: (Character @env0:codePoint: 120150) @env0:asString.
	d @env0:at: 'epar' put: (Character @env0:codePoint: 8917) @env0:asString.
	d @env0:at: 'eparsl' put: (Character @env0:codePoint: 10723) @env0:asString.
	d @env0:at: 'eplus' put: (Character @env0:codePoint: 10865) @env0:asString.
	d @env0:at: 'epsi' put: (Character @env0:codePoint: 949) @env0:asString.
	d @env0:at: 'Epsilon' put: (Character @env0:codePoint: 917) @env0:asString.
	d @env0:at: 'epsilon' put: (Character @env0:codePoint: 949) @env0:asString.
	d @env0:at: 'epsiv' put: (Character @env0:codePoint: 1013) @env0:asString.
	d @env0:at: 'eqcirc' put: (Character @env0:codePoint: 8790) @env0:asString.
	d @env0:at: 'eqcolon' put: (Character @env0:codePoint: 8789) @env0:asString.
	d @env0:at: 'eqsim' put: (Character @env0:codePoint: 8770) @env0:asString.
	d @env0:at: 'eqslantgtr' put: (Character @env0:codePoint: 10902) @env0:asString.
	d @env0:at: 'eqslantless' put: (Character @env0:codePoint: 10901) @env0:asString.
	d @env0:at: 'Equal' put: (Character @env0:codePoint: 10869) @env0:asString.
	d @env0:at: 'equals' put: (Character @env0:codePoint: 61) @env0:asString.
	d @env0:at: 'EqualTilde' put: (Character @env0:codePoint: 8770) @env0:asString.
	d @env0:at: 'equest' put: (Character @env0:codePoint: 8799) @env0:asString.
	d @env0:at: 'Equilibrium' put: (Character @env0:codePoint: 8652) @env0:asString.
	d @env0:at: 'equiv' put: (Character @env0:codePoint: 8801) @env0:asString.
	d @env0:at: 'equivDD' put: (Character @env0:codePoint: 10872) @env0:asString.
	d @env0:at: 'eqvparsl' put: (Character @env0:codePoint: 10725) @env0:asString.
	d @env0:at: 'erarr' put: (Character @env0:codePoint: 10609) @env0:asString.
	d @env0:at: 'erDot' put: (Character @env0:codePoint: 8787) @env0:asString.
	d @env0:at: 'Escr' put: (Character @env0:codePoint: 8496) @env0:asString.
	d @env0:at: 'escr' put: (Character @env0:codePoint: 8495) @env0:asString.
	d @env0:at: 'esdot' put: (Character @env0:codePoint: 8784) @env0:asString.
	d @env0:at: 'Esim' put: (Character @env0:codePoint: 10867) @env0:asString.
	d @env0:at: 'esim' put: (Character @env0:codePoint: 8770) @env0:asString.
	d @env0:at: 'Eta' put: (Character @env0:codePoint: 919) @env0:asString.
	d @env0:at: 'eta' put: (Character @env0:codePoint: 951) @env0:asString.
	d @env0:at: 'ETH' put: (Character @env0:codePoint: 208) @env0:asString.
	d @env0:at: 'eth' put: (Character @env0:codePoint: 240) @env0:asString.
	d @env0:at: 'Euml' put: (Character @env0:codePoint: 203) @env0:asString.
	d @env0:at: 'euml' put: (Character @env0:codePoint: 235) @env0:asString.
	d @env0:at: 'euro' put: (Character @env0:codePoint: 8364) @env0:asString.
	d @env0:at: 'excl' put: (Character @env0:codePoint: 33) @env0:asString.
	d @env0:at: 'exist' put: (Character @env0:codePoint: 8707) @env0:asString.
	d @env0:at: 'Exists' put: (Character @env0:codePoint: 8707) @env0:asString.
	d @env0:at: 'expectation' put: (Character @env0:codePoint: 8496) @env0:asString.
	d @env0:at: 'ExponentialE' put: (Character @env0:codePoint: 8519) @env0:asString.
	d @env0:at: 'exponentiale' put: (Character @env0:codePoint: 8519) @env0:asString.
	d @env0:at: 'fallingdotseq' put: (Character @env0:codePoint: 8786) @env0:asString.
	d @env0:at: 'Fcy' put: (Character @env0:codePoint: 1060) @env0:asString.
	d @env0:at: 'fcy' put: (Character @env0:codePoint: 1092) @env0:asString.
	d @env0:at: 'female' put: (Character @env0:codePoint: 9792) @env0:asString.
	d @env0:at: 'ffilig' put: (Character @env0:codePoint: 64259) @env0:asString.
	d @env0:at: 'fflig' put: (Character @env0:codePoint: 64256) @env0:asString.
	d @env0:at: 'ffllig' put: (Character @env0:codePoint: 64260) @env0:asString.
	d @env0:at: 'Ffr' put: (Character @env0:codePoint: 120073) @env0:asString.
	d @env0:at: 'ffr' put: (Character @env0:codePoint: 120099) @env0:asString.
	d @env0:at: 'filig' put: (Character @env0:codePoint: 64257) @env0:asString.
	d @env0:at: 'FilledSmallSquare' put: (Character @env0:codePoint: 9724) @env0:asString.
	d @env0:at: 'FilledVerySmallSquare' put: (Character @env0:codePoint: 9642) @env0:asString.
	d @env0:at: 'fjlig' put: ((Character @env0:codePoint: 102) @env0:asString @env0:, (Character @env0:codePoint: 106) @env0:asString).
	d @env0:at: 'flat' put: (Character @env0:codePoint: 9837) @env0:asString.
	d @env0:at: 'fllig' put: (Character @env0:codePoint: 64258) @env0:asString.
	d @env0:at: 'fltns' put: (Character @env0:codePoint: 9649) @env0:asString.
	d @env0:at: 'fnof' put: (Character @env0:codePoint: 402) @env0:asString.
	d @env0:at: 'Fopf' put: (Character @env0:codePoint: 120125) @env0:asString.
	d @env0:at: 'fopf' put: (Character @env0:codePoint: 120151) @env0:asString.
	d @env0:at: 'ForAll' put: (Character @env0:codePoint: 8704) @env0:asString.
	d @env0:at: 'forall' put: (Character @env0:codePoint: 8704) @env0:asString.
	d @env0:at: 'fork' put: (Character @env0:codePoint: 8916) @env0:asString.
	d @env0:at: 'forkv' put: (Character @env0:codePoint: 10969) @env0:asString.
	d @env0:at: 'Fouriertrf' put: (Character @env0:codePoint: 8497) @env0:asString.
	d @env0:at: 'fpartint' put: (Character @env0:codePoint: 10765) @env0:asString.
	d @env0:at: 'frac12' put: (Character @env0:codePoint: 189) @env0:asString.
	d @env0:at: 'frac13' put: (Character @env0:codePoint: 8531) @env0:asString.
	d @env0:at: 'frac14' put: (Character @env0:codePoint: 188) @env0:asString.
	d @env0:at: 'frac15' put: (Character @env0:codePoint: 8533) @env0:asString.
	d @env0:at: 'frac16' put: (Character @env0:codePoint: 8537) @env0:asString.
	d @env0:at: 'frac18' put: (Character @env0:codePoint: 8539) @env0:asString.
	d @env0:at: 'frac23' put: (Character @env0:codePoint: 8532) @env0:asString.
	d @env0:at: 'frac25' put: (Character @env0:codePoint: 8534) @env0:asString.
	d @env0:at: 'frac34' put: (Character @env0:codePoint: 190) @env0:asString.
	d @env0:at: 'frac35' put: (Character @env0:codePoint: 8535) @env0:asString.
	d @env0:at: 'frac38' put: (Character @env0:codePoint: 8540) @env0:asString.
	d @env0:at: 'frac45' put: (Character @env0:codePoint: 8536) @env0:asString.
	d @env0:at: 'frac56' put: (Character @env0:codePoint: 8538) @env0:asString.
	d @env0:at: 'frac58' put: (Character @env0:codePoint: 8541) @env0:asString.
	d @env0:at: 'frac78' put: (Character @env0:codePoint: 8542) @env0:asString.
	d @env0:at: 'frasl' put: (Character @env0:codePoint: 8260) @env0:asString.
	d @env0:at: 'frown' put: (Character @env0:codePoint: 8994) @env0:asString.
	d @env0:at: 'Fscr' put: (Character @env0:codePoint: 8497) @env0:asString.
	d @env0:at: 'fscr' put: (Character @env0:codePoint: 119995) @env0:asString.
	d @env0:at: 'gacute' put: (Character @env0:codePoint: 501) @env0:asString.
	d @env0:at: 'Gamma' put: (Character @env0:codePoint: 915) @env0:asString.
	d @env0:at: 'gamma' put: (Character @env0:codePoint: 947) @env0:asString.
	d @env0:at: 'Gammad' put: (Character @env0:codePoint: 988) @env0:asString.
	d @env0:at: 'gammad' put: (Character @env0:codePoint: 989) @env0:asString.
	d @env0:at: 'gap' put: (Character @env0:codePoint: 10886) @env0:asString.
	d @env0:at: 'Gbreve' put: (Character @env0:codePoint: 286) @env0:asString.
	d @env0:at: 'gbreve' put: (Character @env0:codePoint: 287) @env0:asString.
	d @env0:at: 'Gcedil' put: (Character @env0:codePoint: 290) @env0:asString.
	d @env0:at: 'Gcirc' put: (Character @env0:codePoint: 284) @env0:asString.
	d @env0:at: 'gcirc' put: (Character @env0:codePoint: 285) @env0:asString.
	d @env0:at: 'Gcy' put: (Character @env0:codePoint: 1043) @env0:asString.
	d @env0:at: 'gcy' put: (Character @env0:codePoint: 1075) @env0:asString.
	d @env0:at: 'Gdot' put: (Character @env0:codePoint: 288) @env0:asString.
	d @env0:at: 'gdot' put: (Character @env0:codePoint: 289) @env0:asString.
	d @env0:at: 'gE' put: (Character @env0:codePoint: 8807) @env0:asString.
	d @env0:at: 'ge' put: (Character @env0:codePoint: 8805) @env0:asString.
	d @env0:at: 'gEl' put: (Character @env0:codePoint: 10892) @env0:asString.
	d @env0:at: 'gel' put: (Character @env0:codePoint: 8923) @env0:asString.
	d @env0:at: 'geq' put: (Character @env0:codePoint: 8805) @env0:asString.
	d @env0:at: 'geqq' put: (Character @env0:codePoint: 8807) @env0:asString.
	d @env0:at: 'geqslant' put: (Character @env0:codePoint: 10878) @env0:asString.
	d @env0:at: 'ges' put: (Character @env0:codePoint: 10878) @env0:asString.
	d @env0:at: 'gescc' put: (Character @env0:codePoint: 10921) @env0:asString.
	d @env0:at: 'gesdot' put: (Character @env0:codePoint: 10880) @env0:asString.
	d @env0:at: 'gesdoto' put: (Character @env0:codePoint: 10882) @env0:asString.
	d @env0:at: 'gesdotol' put: (Character @env0:codePoint: 10884) @env0:asString.
	d @env0:at: 'gesl' put: ((Character @env0:codePoint: 8923) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'gesles' put: (Character @env0:codePoint: 10900) @env0:asString.
	d @env0:at: 'Gfr' put: (Character @env0:codePoint: 120074) @env0:asString.
	d @env0:at: 'gfr' put: (Character @env0:codePoint: 120100) @env0:asString.
	d @env0:at: 'Gg' put: (Character @env0:codePoint: 8921) @env0:asString.
	d @env0:at: 'gg' put: (Character @env0:codePoint: 8811) @env0:asString.
	d @env0:at: 'ggg' put: (Character @env0:codePoint: 8921) @env0:asString.
	d @env0:at: 'gimel' put: (Character @env0:codePoint: 8503) @env0:asString.
	d @env0:at: 'GJcy' put: (Character @env0:codePoint: 1027) @env0:asString.
	d @env0:at: 'gjcy' put: (Character @env0:codePoint: 1107) @env0:asString.
	d @env0:at: 'gl' put: (Character @env0:codePoint: 8823) @env0:asString.
	d @env0:at: 'gla' put: (Character @env0:codePoint: 10917) @env0:asString.
	d @env0:at: 'glE' put: (Character @env0:codePoint: 10898) @env0:asString.
	d @env0:at: 'glj' put: (Character @env0:codePoint: 10916) @env0:asString.
	d @env0:at: 'gnap' put: (Character @env0:codePoint: 10890) @env0:asString.
	d @env0:at: 'gnapprox' put: (Character @env0:codePoint: 10890) @env0:asString.
	d @env0:at: 'gnE' put: (Character @env0:codePoint: 8809) @env0:asString.
	d @env0:at: 'gne' put: (Character @env0:codePoint: 10888) @env0:asString.
	d @env0:at: 'gneq' put: (Character @env0:codePoint: 10888) @env0:asString.
	d @env0:at: 'gneqq' put: (Character @env0:codePoint: 8809) @env0:asString.
	d @env0:at: 'gnsim' put: (Character @env0:codePoint: 8935) @env0:asString.
	d @env0:at: 'Gopf' put: (Character @env0:codePoint: 120126) @env0:asString.
	d @env0:at: 'gopf' put: (Character @env0:codePoint: 120152) @env0:asString.
	d @env0:at: 'grave' put: (Character @env0:codePoint: 96) @env0:asString.
	d @env0:at: 'GreaterEqual' put: (Character @env0:codePoint: 8805) @env0:asString.
	d @env0:at: 'GreaterEqualLess' put: (Character @env0:codePoint: 8923) @env0:asString.
	d @env0:at: 'GreaterFullEqual' put: (Character @env0:codePoint: 8807) @env0:asString.
	d @env0:at: 'GreaterGreater' put: (Character @env0:codePoint: 10914) @env0:asString.
	d @env0:at: 'GreaterLess' put: (Character @env0:codePoint: 8823) @env0:asString.
	d @env0:at: 'GreaterSlantEqual' put: (Character @env0:codePoint: 10878) @env0:asString.
	d @env0:at: 'GreaterTilde' put: (Character @env0:codePoint: 8819) @env0:asString.
	d @env0:at: 'Gscr' put: (Character @env0:codePoint: 119970) @env0:asString.
	d @env0:at: 'gscr' put: (Character @env0:codePoint: 8458) @env0:asString.
	d @env0:at: 'gsim' put: (Character @env0:codePoint: 8819) @env0:asString.
	d @env0:at: 'gsime' put: (Character @env0:codePoint: 10894) @env0:asString.
	d @env0:at: 'gsiml' put: (Character @env0:codePoint: 10896) @env0:asString.
	d @env0:at: 'GT' put: (Character @env0:codePoint: 62) @env0:asString.
	d @env0:at: 'Gt' put: (Character @env0:codePoint: 8811) @env0:asString.
	d @env0:at: 'gt' put: (Character @env0:codePoint: 62) @env0:asString.
	d @env0:at: 'gtcc' put: (Character @env0:codePoint: 10919) @env0:asString.
	d @env0:at: 'gtcir' put: (Character @env0:codePoint: 10874) @env0:asString.
	d @env0:at: 'gtdot' put: (Character @env0:codePoint: 8919) @env0:asString.
	d @env0:at: 'gtlPar' put: (Character @env0:codePoint: 10645) @env0:asString.
	d @env0:at: 'gtquest' put: (Character @env0:codePoint: 10876) @env0:asString.
	d @env0:at: 'gtrapprox' put: (Character @env0:codePoint: 10886) @env0:asString.
	d @env0:at: 'gtrarr' put: (Character @env0:codePoint: 10616) @env0:asString.
	d @env0:at: 'gtrdot' put: (Character @env0:codePoint: 8919) @env0:asString.
	d @env0:at: 'gtreqless' put: (Character @env0:codePoint: 8923) @env0:asString.
	d @env0:at: 'gtreqqless' put: (Character @env0:codePoint: 10892) @env0:asString.
	d @env0:at: 'gtrless' put: (Character @env0:codePoint: 8823) @env0:asString.
	d @env0:at: 'gtrsim' put: (Character @env0:codePoint: 8819) @env0:asString.
	d @env0:at: 'gvertneqq' put: ((Character @env0:codePoint: 8809) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'gvnE' put: ((Character @env0:codePoint: 8809) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'Hacek' put: (Character @env0:codePoint: 711) @env0:asString.
	d @env0:at: 'hairsp' put: (Character @env0:codePoint: 8202) @env0:asString.
	d @env0:at: 'half' put: (Character @env0:codePoint: 189) @env0:asString.
	d @env0:at: 'hamilt' put: (Character @env0:codePoint: 8459) @env0:asString.
	d @env0:at: 'HARDcy' put: (Character @env0:codePoint: 1066) @env0:asString.
	d @env0:at: 'hardcy' put: (Character @env0:codePoint: 1098) @env0:asString.
	d @env0:at: 'hArr' put: (Character @env0:codePoint: 8660) @env0:asString.
	d @env0:at: 'harr' put: (Character @env0:codePoint: 8596) @env0:asString.
	d @env0:at: 'harrcir' put: (Character @env0:codePoint: 10568) @env0:asString.
	d @env0:at: 'harrw' put: (Character @env0:codePoint: 8621) @env0:asString.
	d @env0:at: 'Hat' put: (Character @env0:codePoint: 94) @env0:asString.
	d @env0:at: 'hbar' put: (Character @env0:codePoint: 8463) @env0:asString.
	d @env0:at: 'Hcirc' put: (Character @env0:codePoint: 292) @env0:asString.
	d @env0:at: 'hcirc' put: (Character @env0:codePoint: 293) @env0:asString.
	d @env0:at: 'hearts' put: (Character @env0:codePoint: 9829) @env0:asString.
	d @env0:at: 'heartsuit' put: (Character @env0:codePoint: 9829) @env0:asString.
	d @env0:at: 'hellip' put: (Character @env0:codePoint: 8230) @env0:asString.
	d @env0:at: 'hercon' put: (Character @env0:codePoint: 8889) @env0:asString.
	d @env0:at: 'Hfr' put: (Character @env0:codePoint: 8460) @env0:asString.
	d @env0:at: 'hfr' put: (Character @env0:codePoint: 120101) @env0:asString.
	d @env0:at: 'HilbertSpace' put: (Character @env0:codePoint: 8459) @env0:asString.
	d @env0:at: 'hksearow' put: (Character @env0:codePoint: 10533) @env0:asString.
	d @env0:at: 'hkswarow' put: (Character @env0:codePoint: 10534) @env0:asString.
	d @env0:at: 'hoarr' put: (Character @env0:codePoint: 8703) @env0:asString.
	d @env0:at: 'homtht' put: (Character @env0:codePoint: 8763) @env0:asString.
	d @env0:at: 'hookleftarrow' put: (Character @env0:codePoint: 8617) @env0:asString.
	d @env0:at: 'hookrightarrow' put: (Character @env0:codePoint: 8618) @env0:asString.
	d @env0:at: 'Hopf' put: (Character @env0:codePoint: 8461) @env0:asString.
	d @env0:at: 'hopf' put: (Character @env0:codePoint: 120153) @env0:asString.
	d @env0:at: 'horbar' put: (Character @env0:codePoint: 8213) @env0:asString.
	d @env0:at: 'HorizontalLine' put: (Character @env0:codePoint: 9472) @env0:asString.
	d @env0:at: 'Hscr' put: (Character @env0:codePoint: 8459) @env0:asString.
	d @env0:at: 'hscr' put: (Character @env0:codePoint: 119997) @env0:asString.
	d @env0:at: 'hslash' put: (Character @env0:codePoint: 8463) @env0:asString.
	d @env0:at: 'Hstrok' put: (Character @env0:codePoint: 294) @env0:asString.
	d @env0:at: 'hstrok' put: (Character @env0:codePoint: 295) @env0:asString.
	d @env0:at: 'HumpDownHump' put: (Character @env0:codePoint: 8782) @env0:asString.
	d @env0:at: 'HumpEqual' put: (Character @env0:codePoint: 8783) @env0:asString.
	d @env0:at: 'hybull' put: (Character @env0:codePoint: 8259) @env0:asString.
	d @env0:at: 'hyphen' put: (Character @env0:codePoint: 8208) @env0:asString.
	d @env0:at: 'Iacute' put: (Character @env0:codePoint: 205) @env0:asString.
	d @env0:at: 'iacute' put: (Character @env0:codePoint: 237) @env0:asString.
	d @env0:at: 'ic' put: (Character @env0:codePoint: 8291) @env0:asString.
	d @env0:at: 'Icirc' put: (Character @env0:codePoint: 206) @env0:asString.
	d @env0:at: 'icirc' put: (Character @env0:codePoint: 238) @env0:asString.
	d @env0:at: 'Icy' put: (Character @env0:codePoint: 1048) @env0:asString.
	d @env0:at: 'icy' put: (Character @env0:codePoint: 1080) @env0:asString.
	d @env0:at: 'Idot' put: (Character @env0:codePoint: 304) @env0:asString.
	d @env0:at: 'IEcy' put: (Character @env0:codePoint: 1045) @env0:asString.
	d @env0:at: 'iecy' put: (Character @env0:codePoint: 1077) @env0:asString.
	d @env0:at: 'iexcl' put: (Character @env0:codePoint: 161) @env0:asString.
	d @env0:at: 'iff' put: (Character @env0:codePoint: 8660) @env0:asString.
	d @env0:at: 'Ifr' put: (Character @env0:codePoint: 8465) @env0:asString.
	d @env0:at: 'ifr' put: (Character @env0:codePoint: 120102) @env0:asString.
	d @env0:at: 'Igrave' put: (Character @env0:codePoint: 204) @env0:asString.
	d @env0:at: 'igrave' put: (Character @env0:codePoint: 236) @env0:asString.
	d @env0:at: 'ii' put: (Character @env0:codePoint: 8520) @env0:asString.
	d @env0:at: 'iiiint' put: (Character @env0:codePoint: 10764) @env0:asString.
	d @env0:at: 'iiint' put: (Character @env0:codePoint: 8749) @env0:asString.
	d @env0:at: 'iinfin' put: (Character @env0:codePoint: 10716) @env0:asString.
	d @env0:at: 'iiota' put: (Character @env0:codePoint: 8489) @env0:asString.
	d @env0:at: 'IJlig' put: (Character @env0:codePoint: 306) @env0:asString.
	d @env0:at: 'ijlig' put: (Character @env0:codePoint: 307) @env0:asString.
	d @env0:at: 'Im' put: (Character @env0:codePoint: 8465) @env0:asString.
	d @env0:at: 'Imacr' put: (Character @env0:codePoint: 298) @env0:asString.
	d @env0:at: 'imacr' put: (Character @env0:codePoint: 299) @env0:asString.
	d @env0:at: 'image' put: (Character @env0:codePoint: 8465) @env0:asString.
	d @env0:at: 'ImaginaryI' put: (Character @env0:codePoint: 8520) @env0:asString.
	d @env0:at: 'imagline' put: (Character @env0:codePoint: 8464) @env0:asString.
	d @env0:at: 'imagpart' put: (Character @env0:codePoint: 8465) @env0:asString.
	d @env0:at: 'imath' put: (Character @env0:codePoint: 305) @env0:asString.
	d @env0:at: 'imof' put: (Character @env0:codePoint: 8887) @env0:asString.
	d @env0:at: 'imped' put: (Character @env0:codePoint: 437) @env0:asString.
	d @env0:at: 'Implies' put: (Character @env0:codePoint: 8658) @env0:asString.
	d @env0:at: 'in' put: (Character @env0:codePoint: 8712) @env0:asString.
	d @env0:at: 'incare' put: (Character @env0:codePoint: 8453) @env0:asString.
	d @env0:at: 'infin' put: (Character @env0:codePoint: 8734) @env0:asString.
	d @env0:at: 'infintie' put: (Character @env0:codePoint: 10717) @env0:asString.
	d @env0:at: 'inodot' put: (Character @env0:codePoint: 305) @env0:asString.
	d @env0:at: 'Int' put: (Character @env0:codePoint: 8748) @env0:asString.
	d @env0:at: 'int' put: (Character @env0:codePoint: 8747) @env0:asString.
	d @env0:at: 'intcal' put: (Character @env0:codePoint: 8890) @env0:asString.
	d @env0:at: 'integers' put: (Character @env0:codePoint: 8484) @env0:asString.
	d @env0:at: 'Integral' put: (Character @env0:codePoint: 8747) @env0:asString.
	d @env0:at: 'intercal' put: (Character @env0:codePoint: 8890) @env0:asString.
	d @env0:at: 'Intersection' put: (Character @env0:codePoint: 8898) @env0:asString.
	d @env0:at: 'intlarhk' put: (Character @env0:codePoint: 10775) @env0:asString.
	d @env0:at: 'intprod' put: (Character @env0:codePoint: 10812) @env0:asString.
	d @env0:at: 'InvisibleComma' put: (Character @env0:codePoint: 8291) @env0:asString.
	d @env0:at: 'InvisibleTimes' put: (Character @env0:codePoint: 8290) @env0:asString.
	d @env0:at: 'IOcy' put: (Character @env0:codePoint: 1025) @env0:asString.
	d @env0:at: 'iocy' put: (Character @env0:codePoint: 1105) @env0:asString.
	d @env0:at: 'Iogon' put: (Character @env0:codePoint: 302) @env0:asString.
	d @env0:at: 'iogon' put: (Character @env0:codePoint: 303) @env0:asString.
	d @env0:at: 'Iopf' put: (Character @env0:codePoint: 120128) @env0:asString.
	d @env0:at: 'iopf' put: (Character @env0:codePoint: 120154) @env0:asString.
	d @env0:at: 'Iota' put: (Character @env0:codePoint: 921) @env0:asString.
	d @env0:at: 'iota' put: (Character @env0:codePoint: 953) @env0:asString.
	d @env0:at: 'iprod' put: (Character @env0:codePoint: 10812) @env0:asString.
	d @env0:at: 'iquest' put: (Character @env0:codePoint: 191) @env0:asString.
	d @env0:at: 'Iscr' put: (Character @env0:codePoint: 8464) @env0:asString.
	d @env0:at: 'iscr' put: (Character @env0:codePoint: 119998) @env0:asString.
	d @env0:at: 'isin' put: (Character @env0:codePoint: 8712) @env0:asString.
	d @env0:at: 'isindot' put: (Character @env0:codePoint: 8949) @env0:asString.
	d @env0:at: 'isinE' put: (Character @env0:codePoint: 8953) @env0:asString.
	d @env0:at: 'isins' put: (Character @env0:codePoint: 8948) @env0:asString.
	d @env0:at: 'isinsv' put: (Character @env0:codePoint: 8947) @env0:asString.
	d @env0:at: 'isinv' put: (Character @env0:codePoint: 8712) @env0:asString.
	d @env0:at: 'it' put: (Character @env0:codePoint: 8290) @env0:asString.
	d @env0:at: 'Itilde' put: (Character @env0:codePoint: 296) @env0:asString.
	d @env0:at: 'itilde' put: (Character @env0:codePoint: 297) @env0:asString.
	d @env0:at: 'Iukcy' put: (Character @env0:codePoint: 1030) @env0:asString.
	d @env0:at: 'iukcy' put: (Character @env0:codePoint: 1110) @env0:asString.
	d @env0:at: 'Iuml' put: (Character @env0:codePoint: 207) @env0:asString.
	d @env0:at: 'iuml' put: (Character @env0:codePoint: 239) @env0:asString.
	d @env0:at: 'Jcirc' put: (Character @env0:codePoint: 308) @env0:asString.
	d @env0:at: 'jcirc' put: (Character @env0:codePoint: 309) @env0:asString.
	d @env0:at: 'Jcy' put: (Character @env0:codePoint: 1049) @env0:asString.
	d @env0:at: 'jcy' put: (Character @env0:codePoint: 1081) @env0:asString.
	d @env0:at: 'Jfr' put: (Character @env0:codePoint: 120077) @env0:asString.
	d @env0:at: 'jfr' put: (Character @env0:codePoint: 120103) @env0:asString.
	d @env0:at: 'jmath' put: (Character @env0:codePoint: 567) @env0:asString.
	d @env0:at: 'Jopf' put: (Character @env0:codePoint: 120129) @env0:asString.
	d @env0:at: 'jopf' put: (Character @env0:codePoint: 120155) @env0:asString.
	d @env0:at: 'Jscr' put: (Character @env0:codePoint: 119973) @env0:asString.
	d @env0:at: 'jscr' put: (Character @env0:codePoint: 119999) @env0:asString.
	d @env0:at: 'Jsercy' put: (Character @env0:codePoint: 1032) @env0:asString.
	d @env0:at: 'jsercy' put: (Character @env0:codePoint: 1112) @env0:asString.
	d @env0:at: 'Jukcy' put: (Character @env0:codePoint: 1028) @env0:asString.
	d @env0:at: 'jukcy' put: (Character @env0:codePoint: 1108) @env0:asString.
	d @env0:at: 'Kappa' put: (Character @env0:codePoint: 922) @env0:asString.
	d @env0:at: 'kappa' put: (Character @env0:codePoint: 954) @env0:asString.
	d @env0:at: 'kappav' put: (Character @env0:codePoint: 1008) @env0:asString.
	d @env0:at: 'Kcedil' put: (Character @env0:codePoint: 310) @env0:asString.
	d @env0:at: 'kcedil' put: (Character @env0:codePoint: 311) @env0:asString.
	d @env0:at: 'Kcy' put: (Character @env0:codePoint: 1050) @env0:asString.
	d @env0:at: 'kcy' put: (Character @env0:codePoint: 1082) @env0:asString.
	d @env0:at: 'Kfr' put: (Character @env0:codePoint: 120078) @env0:asString.
	d @env0:at: 'kfr' put: (Character @env0:codePoint: 120104) @env0:asString.
	d @env0:at: 'kgreen' put: (Character @env0:codePoint: 312) @env0:asString.
	d @env0:at: 'KHcy' put: (Character @env0:codePoint: 1061) @env0:asString.
	d @env0:at: 'khcy' put: (Character @env0:codePoint: 1093) @env0:asString.
	d @env0:at: 'KJcy' put: (Character @env0:codePoint: 1036) @env0:asString.
	d @env0:at: 'kjcy' put: (Character @env0:codePoint: 1116) @env0:asString.
	d @env0:at: 'Kopf' put: (Character @env0:codePoint: 120130) @env0:asString.
	d @env0:at: 'kopf' put: (Character @env0:codePoint: 120156) @env0:asString.
	d @env0:at: 'Kscr' put: (Character @env0:codePoint: 119974) @env0:asString.
	d @env0:at: 'kscr' put: (Character @env0:codePoint: 120000) @env0:asString.
	d @env0:at: 'lAarr' put: (Character @env0:codePoint: 8666) @env0:asString.
	d @env0:at: 'Lacute' put: (Character @env0:codePoint: 313) @env0:asString.
	d @env0:at: 'lacute' put: (Character @env0:codePoint: 314) @env0:asString.
	d @env0:at: 'laemptyv' put: (Character @env0:codePoint: 10676) @env0:asString.
	d @env0:at: 'lagran' put: (Character @env0:codePoint: 8466) @env0:asString.
	d @env0:at: 'Lambda' put: (Character @env0:codePoint: 923) @env0:asString.
	d @env0:at: 'lambda' put: (Character @env0:codePoint: 955) @env0:asString.
	d @env0:at: 'Lang' put: (Character @env0:codePoint: 10218) @env0:asString.
	d @env0:at: 'lang' put: (Character @env0:codePoint: 10216) @env0:asString.
	d @env0:at: 'langd' put: (Character @env0:codePoint: 10641) @env0:asString.
	d @env0:at: 'langle' put: (Character @env0:codePoint: 10216) @env0:asString.
	d @env0:at: 'lap' put: (Character @env0:codePoint: 10885) @env0:asString.
	d @env0:at: 'Laplacetrf' put: (Character @env0:codePoint: 8466) @env0:asString.
	d @env0:at: 'laquo' put: (Character @env0:codePoint: 171) @env0:asString.
	d @env0:at: 'Larr' put: (Character @env0:codePoint: 8606) @env0:asString.
	d @env0:at: 'lArr' put: (Character @env0:codePoint: 8656) @env0:asString.
	d @env0:at: 'larr' put: (Character @env0:codePoint: 8592) @env0:asString.
	d @env0:at: 'larrb' put: (Character @env0:codePoint: 8676) @env0:asString.
	d @env0:at: 'larrbfs' put: (Character @env0:codePoint: 10527) @env0:asString.
	d @env0:at: 'larrfs' put: (Character @env0:codePoint: 10525) @env0:asString.
	d @env0:at: 'larrhk' put: (Character @env0:codePoint: 8617) @env0:asString.
	d @env0:at: 'larrlp' put: (Character @env0:codePoint: 8619) @env0:asString.
	d @env0:at: 'larrpl' put: (Character @env0:codePoint: 10553) @env0:asString.
	d @env0:at: 'larrsim' put: (Character @env0:codePoint: 10611) @env0:asString.
	d @env0:at: 'larrtl' put: (Character @env0:codePoint: 8610) @env0:asString.
	d @env0:at: 'lat' put: (Character @env0:codePoint: 10923) @env0:asString.
	d @env0:at: 'lAtail' put: (Character @env0:codePoint: 10523) @env0:asString.
	d @env0:at: 'latail' put: (Character @env0:codePoint: 10521) @env0:asString.
	d @env0:at: 'late' put: (Character @env0:codePoint: 10925) @env0:asString.
	d @env0:at: 'lates' put: ((Character @env0:codePoint: 10925) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'lBarr' put: (Character @env0:codePoint: 10510) @env0:asString.
	d @env0:at: 'lbarr' put: (Character @env0:codePoint: 10508) @env0:asString.
	d @env0:at: 'lbbrk' put: (Character @env0:codePoint: 10098) @env0:asString.
	d @env0:at: 'lbrace' put: (Character @env0:codePoint: 123) @env0:asString.
	d @env0:at: 'lbrack' put: (Character @env0:codePoint: 91) @env0:asString.
	d @env0:at: 'lbrke' put: (Character @env0:codePoint: 10635) @env0:asString.
	d @env0:at: 'lbrksld' put: (Character @env0:codePoint: 10639) @env0:asString.
	d @env0:at: 'lbrkslu' put: (Character @env0:codePoint: 10637) @env0:asString.
	d @env0:at: 'Lcaron' put: (Character @env0:codePoint: 317) @env0:asString.
	d @env0:at: 'lcaron' put: (Character @env0:codePoint: 318) @env0:asString.
	d @env0:at: 'Lcedil' put: (Character @env0:codePoint: 315) @env0:asString.
	d @env0:at: 'lcedil' put: (Character @env0:codePoint: 316) @env0:asString.
	d @env0:at: 'lceil' put: (Character @env0:codePoint: 8968) @env0:asString.
	d @env0:at: 'lcub' put: (Character @env0:codePoint: 123) @env0:asString.
	d @env0:at: 'Lcy' put: (Character @env0:codePoint: 1051) @env0:asString.
	d @env0:at: 'lcy' put: (Character @env0:codePoint: 1083) @env0:asString.
	d @env0:at: 'ldca' put: (Character @env0:codePoint: 10550) @env0:asString.
	d @env0:at: 'ldquo' put: (Character @env0:codePoint: 8220) @env0:asString.
	d @env0:at: 'ldquor' put: (Character @env0:codePoint: 8222) @env0:asString.
	d @env0:at: 'ldrdhar' put: (Character @env0:codePoint: 10599) @env0:asString.
	d @env0:at: 'ldrushar' put: (Character @env0:codePoint: 10571) @env0:asString.
	d @env0:at: 'ldsh' put: (Character @env0:codePoint: 8626) @env0:asString.
	d @env0:at: 'lE' put: (Character @env0:codePoint: 8806) @env0:asString.
	d @env0:at: 'le' put: (Character @env0:codePoint: 8804) @env0:asString.
	d @env0:at: 'LeftAngleBracket' put: (Character @env0:codePoint: 10216) @env0:asString.
	d @env0:at: 'LeftArrow' put: (Character @env0:codePoint: 8592) @env0:asString.
	d @env0:at: 'Leftarrow' put: (Character @env0:codePoint: 8656) @env0:asString.
	d @env0:at: 'leftarrow' put: (Character @env0:codePoint: 8592) @env0:asString.
	d @env0:at: 'LeftArrowBar' put: (Character @env0:codePoint: 8676) @env0:asString.
	d @env0:at: 'LeftArrowRightArrow' put: (Character @env0:codePoint: 8646) @env0:asString.
	d @env0:at: 'leftarrowtail' put: (Character @env0:codePoint: 8610) @env0:asString.
	d @env0:at: 'LeftCeiling' put: (Character @env0:codePoint: 8968) @env0:asString.
	d @env0:at: 'LeftDoubleBracket' put: (Character @env0:codePoint: 10214) @env0:asString.
	d @env0:at: 'LeftDownTeeVector' put: (Character @env0:codePoint: 10593) @env0:asString.
	d @env0:at: 'LeftDownVector' put: (Character @env0:codePoint: 8643) @env0:asString.
	d @env0:at: 'LeftDownVectorBar' put: (Character @env0:codePoint: 10585) @env0:asString.
	d @env0:at: 'LeftFloor' put: (Character @env0:codePoint: 8970) @env0:asString.
	d @env0:at: 'leftharpoondown' put: (Character @env0:codePoint: 8637) @env0:asString.
	d @env0:at: 'leftharpoonup' put: (Character @env0:codePoint: 8636) @env0:asString.
	d @env0:at: 'leftleftarrows' put: (Character @env0:codePoint: 8647) @env0:asString.
	d @env0:at: 'LeftRightArrow' put: (Character @env0:codePoint: 8596) @env0:asString.
	d @env0:at: 'Leftrightarrow' put: (Character @env0:codePoint: 8660) @env0:asString.
	d @env0:at: 'leftrightarrow' put: (Character @env0:codePoint: 8596) @env0:asString.
	d @env0:at: 'leftrightarrows' put: (Character @env0:codePoint: 8646) @env0:asString.
	d @env0:at: 'leftrightharpoons' put: (Character @env0:codePoint: 8651) @env0:asString.
	d @env0:at: 'leftrightsquigarrow' put: (Character @env0:codePoint: 8621) @env0:asString.
	d @env0:at: 'LeftRightVector' put: (Character @env0:codePoint: 10574) @env0:asString.
	d @env0:at: 'LeftTee' put: (Character @env0:codePoint: 8867) @env0:asString.
	d @env0:at: 'LeftTeeArrow' put: (Character @env0:codePoint: 8612) @env0:asString.
	d @env0:at: 'LeftTeeVector' put: (Character @env0:codePoint: 10586) @env0:asString.
	d @env0:at: 'leftthreetimes' put: (Character @env0:codePoint: 8907) @env0:asString.
	d @env0:at: 'LeftTriangle' put: (Character @env0:codePoint: 8882) @env0:asString.
	d @env0:at: 'LeftTriangleBar' put: (Character @env0:codePoint: 10703) @env0:asString.
	d @env0:at: 'LeftTriangleEqual' put: (Character @env0:codePoint: 8884) @env0:asString.
	d @env0:at: 'LeftUpDownVector' put: (Character @env0:codePoint: 10577) @env0:asString.
	d @env0:at: 'LeftUpTeeVector' put: (Character @env0:codePoint: 10592) @env0:asString.
	d @env0:at: 'LeftUpVector' put: (Character @env0:codePoint: 8639) @env0:asString.
	d @env0:at: 'LeftUpVectorBar' put: (Character @env0:codePoint: 10584) @env0:asString.
	d @env0:at: 'LeftVector' put: (Character @env0:codePoint: 8636) @env0:asString.
	d @env0:at: 'LeftVectorBar' put: (Character @env0:codePoint: 10578) @env0:asString.
	d @env0:at: 'lEg' put: (Character @env0:codePoint: 10891) @env0:asString.
	d @env0:at: 'leg' put: (Character @env0:codePoint: 8922) @env0:asString.
	d @env0:at: 'leq' put: (Character @env0:codePoint: 8804) @env0:asString.
	d @env0:at: 'leqq' put: (Character @env0:codePoint: 8806) @env0:asString.
	d @env0:at: 'leqslant' put: (Character @env0:codePoint: 10877) @env0:asString.
	d @env0:at: 'les' put: (Character @env0:codePoint: 10877) @env0:asString.
	d @env0:at: 'lescc' put: (Character @env0:codePoint: 10920) @env0:asString.
	d @env0:at: 'lesdot' put: (Character @env0:codePoint: 10879) @env0:asString.
	d @env0:at: 'lesdoto' put: (Character @env0:codePoint: 10881) @env0:asString.
	d @env0:at: 'lesdotor' put: (Character @env0:codePoint: 10883) @env0:asString.
	d @env0:at: 'lesg' put: ((Character @env0:codePoint: 8922) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'lesges' put: (Character @env0:codePoint: 10899) @env0:asString.
	d @env0:at: 'lessapprox' put: (Character @env0:codePoint: 10885) @env0:asString.
	d @env0:at: 'lessdot' put: (Character @env0:codePoint: 8918) @env0:asString.
	d @env0:at: 'lesseqgtr' put: (Character @env0:codePoint: 8922) @env0:asString.
	d @env0:at: 'lesseqqgtr' put: (Character @env0:codePoint: 10891) @env0:asString.
	d @env0:at: 'LessEqualGreater' put: (Character @env0:codePoint: 8922) @env0:asString.
	d @env0:at: 'LessFullEqual' put: (Character @env0:codePoint: 8806) @env0:asString.
	d @env0:at: 'LessGreater' put: (Character @env0:codePoint: 8822) @env0:asString.
	d @env0:at: 'lessgtr' put: (Character @env0:codePoint: 8822) @env0:asString.
	d @env0:at: 'LessLess' put: (Character @env0:codePoint: 10913) @env0:asString.
	d @env0:at: 'lesssim' put: (Character @env0:codePoint: 8818) @env0:asString.
	d @env0:at: 'LessSlantEqual' put: (Character @env0:codePoint: 10877) @env0:asString.
	d @env0:at: 'LessTilde' put: (Character @env0:codePoint: 8818) @env0:asString.
	d @env0:at: 'lfisht' put: (Character @env0:codePoint: 10620) @env0:asString.
	d @env0:at: 'lfloor' put: (Character @env0:codePoint: 8970) @env0:asString.
	d @env0:at: 'Lfr' put: (Character @env0:codePoint: 120079) @env0:asString.
	d @env0:at: 'lfr' put: (Character @env0:codePoint: 120105) @env0:asString.
	d @env0:at: 'lg' put: (Character @env0:codePoint: 8822) @env0:asString.
	d @env0:at: 'lgE' put: (Character @env0:codePoint: 10897) @env0:asString.
	d @env0:at: 'lHar' put: (Character @env0:codePoint: 10594) @env0:asString.
	d @env0:at: 'lhard' put: (Character @env0:codePoint: 8637) @env0:asString.
	d @env0:at: 'lharu' put: (Character @env0:codePoint: 8636) @env0:asString.
	d @env0:at: 'lharul' put: (Character @env0:codePoint: 10602) @env0:asString.
	d @env0:at: 'lhblk' put: (Character @env0:codePoint: 9604) @env0:asString.
	d @env0:at: 'LJcy' put: (Character @env0:codePoint: 1033) @env0:asString.
	d @env0:at: 'ljcy' put: (Character @env0:codePoint: 1113) @env0:asString.
	d @env0:at: 'Ll' put: (Character @env0:codePoint: 8920) @env0:asString.
	d @env0:at: 'll' put: (Character @env0:codePoint: 8810) @env0:asString.
	d @env0:at: 'llarr' put: (Character @env0:codePoint: 8647) @env0:asString.
	d @env0:at: 'llcorner' put: (Character @env0:codePoint: 8990) @env0:asString.
	d @env0:at: 'Lleftarrow' put: (Character @env0:codePoint: 8666) @env0:asString.
	d @env0:at: 'llhard' put: (Character @env0:codePoint: 10603) @env0:asString.
	d @env0:at: 'lltri' put: (Character @env0:codePoint: 9722) @env0:asString.
	d @env0:at: 'Lmidot' put: (Character @env0:codePoint: 319) @env0:asString.
	d @env0:at: 'lmidot' put: (Character @env0:codePoint: 320) @env0:asString.
	d @env0:at: 'lmoust' put: (Character @env0:codePoint: 9136) @env0:asString.
	d @env0:at: 'lmoustache' put: (Character @env0:codePoint: 9136) @env0:asString.
	d @env0:at: 'lnap' put: (Character @env0:codePoint: 10889) @env0:asString.
	d @env0:at: 'lnapprox' put: (Character @env0:codePoint: 10889) @env0:asString.
	d @env0:at: 'lnE' put: (Character @env0:codePoint: 8808) @env0:asString.
	d @env0:at: 'lne' put: (Character @env0:codePoint: 10887) @env0:asString.
	d @env0:at: 'lneq' put: (Character @env0:codePoint: 10887) @env0:asString.
	d @env0:at: 'lneqq' put: (Character @env0:codePoint: 8808) @env0:asString.
	d @env0:at: 'lnsim' put: (Character @env0:codePoint: 8934) @env0:asString.
	d @env0:at: 'loang' put: (Character @env0:codePoint: 10220) @env0:asString.
	d @env0:at: 'loarr' put: (Character @env0:codePoint: 8701) @env0:asString.
	d @env0:at: 'lobrk' put: (Character @env0:codePoint: 10214) @env0:asString.
	d @env0:at: 'LongLeftArrow' put: (Character @env0:codePoint: 10229) @env0:asString.
	d @env0:at: 'Longleftarrow' put: (Character @env0:codePoint: 10232) @env0:asString.
	d @env0:at: 'longleftarrow' put: (Character @env0:codePoint: 10229) @env0:asString.
	d @env0:at: 'LongLeftRightArrow' put: (Character @env0:codePoint: 10231) @env0:asString.
	d @env0:at: 'Longleftrightarrow' put: (Character @env0:codePoint: 10234) @env0:asString.
	d @env0:at: 'longleftrightarrow' put: (Character @env0:codePoint: 10231) @env0:asString.
	d @env0:at: 'longmapsto' put: (Character @env0:codePoint: 10236) @env0:asString.
	d @env0:at: 'LongRightArrow' put: (Character @env0:codePoint: 10230) @env0:asString.
	d @env0:at: 'Longrightarrow' put: (Character @env0:codePoint: 10233) @env0:asString.
	d @env0:at: 'longrightarrow' put: (Character @env0:codePoint: 10230) @env0:asString.
	d @env0:at: 'looparrowleft' put: (Character @env0:codePoint: 8619) @env0:asString.
	d @env0:at: 'looparrowright' put: (Character @env0:codePoint: 8620) @env0:asString.
	d @env0:at: 'lopar' put: (Character @env0:codePoint: 10629) @env0:asString.
	d @env0:at: 'Lopf' put: (Character @env0:codePoint: 120131) @env0:asString.
	d @env0:at: 'lopf' put: (Character @env0:codePoint: 120157) @env0:asString.
	d @env0:at: 'loplus' put: (Character @env0:codePoint: 10797) @env0:asString.
	d @env0:at: 'lotimes' put: (Character @env0:codePoint: 10804) @env0:asString.
	d @env0:at: 'lowast' put: (Character @env0:codePoint: 8727) @env0:asString.
	d @env0:at: 'lowbar' put: (Character @env0:codePoint: 95) @env0:asString.
	d @env0:at: 'LowerLeftArrow' put: (Character @env0:codePoint: 8601) @env0:asString.
	d @env0:at: 'LowerRightArrow' put: (Character @env0:codePoint: 8600) @env0:asString.
	d @env0:at: 'loz' put: (Character @env0:codePoint: 9674) @env0:asString.
	d @env0:at: 'lozenge' put: (Character @env0:codePoint: 9674) @env0:asString.
	d @env0:at: 'lozf' put: (Character @env0:codePoint: 10731) @env0:asString.
	d @env0:at: 'lpar' put: (Character @env0:codePoint: 40) @env0:asString.
	d @env0:at: 'lparlt' put: (Character @env0:codePoint: 10643) @env0:asString.
	d @env0:at: 'lrarr' put: (Character @env0:codePoint: 8646) @env0:asString.
	d @env0:at: 'lrcorner' put: (Character @env0:codePoint: 8991) @env0:asString.
	d @env0:at: 'lrhar' put: (Character @env0:codePoint: 8651) @env0:asString.
	d @env0:at: 'lrhard' put: (Character @env0:codePoint: 10605) @env0:asString.
	d @env0:at: 'lrm' put: (Character @env0:codePoint: 8206) @env0:asString.
	d @env0:at: 'lrtri' put: (Character @env0:codePoint: 8895) @env0:asString.
	d @env0:at: 'lsaquo' put: (Character @env0:codePoint: 8249) @env0:asString.
	d @env0:at: 'Lscr' put: (Character @env0:codePoint: 8466) @env0:asString.
	d @env0:at: 'lscr' put: (Character @env0:codePoint: 120001) @env0:asString.
	d @env0:at: 'Lsh' put: (Character @env0:codePoint: 8624) @env0:asString.
	d @env0:at: 'lsh' put: (Character @env0:codePoint: 8624) @env0:asString.
	d @env0:at: 'lsim' put: (Character @env0:codePoint: 8818) @env0:asString.
	d @env0:at: 'lsime' put: (Character @env0:codePoint: 10893) @env0:asString.
	d @env0:at: 'lsimg' put: (Character @env0:codePoint: 10895) @env0:asString.
	d @env0:at: 'lsqb' put: (Character @env0:codePoint: 91) @env0:asString.
	d @env0:at: 'lsquo' put: (Character @env0:codePoint: 8216) @env0:asString.
	d @env0:at: 'lsquor' put: (Character @env0:codePoint: 8218) @env0:asString.
	d @env0:at: 'Lstrok' put: (Character @env0:codePoint: 321) @env0:asString.
	d @env0:at: 'lstrok' put: (Character @env0:codePoint: 322) @env0:asString.
	d @env0:at: 'LT' put: (Character @env0:codePoint: 60) @env0:asString.
	d @env0:at: 'Lt' put: (Character @env0:codePoint: 8810) @env0:asString.
	d @env0:at: 'lt' put: (Character @env0:codePoint: 60) @env0:asString.
	d @env0:at: 'ltcc' put: (Character @env0:codePoint: 10918) @env0:asString.
	d @env0:at: 'ltcir' put: (Character @env0:codePoint: 10873) @env0:asString.
	d @env0:at: 'ltdot' put: (Character @env0:codePoint: 8918) @env0:asString.
	d @env0:at: 'lthree' put: (Character @env0:codePoint: 8907) @env0:asString.
	d @env0:at: 'ltimes' put: (Character @env0:codePoint: 8905) @env0:asString.
	d @env0:at: 'ltlarr' put: (Character @env0:codePoint: 10614) @env0:asString.
	d @env0:at: 'ltquest' put: (Character @env0:codePoint: 10875) @env0:asString.
	d @env0:at: 'ltri' put: (Character @env0:codePoint: 9667) @env0:asString.
	d @env0:at: 'ltrie' put: (Character @env0:codePoint: 8884) @env0:asString.
	d @env0:at: 'ltrif' put: (Character @env0:codePoint: 9666) @env0:asString.
	d @env0:at: 'ltrPar' put: (Character @env0:codePoint: 10646) @env0:asString.
	d @env0:at: 'lurdshar' put: (Character @env0:codePoint: 10570) @env0:asString.
	d @env0:at: 'luruhar' put: (Character @env0:codePoint: 10598) @env0:asString.
	d @env0:at: 'lvertneqq' put: ((Character @env0:codePoint: 8808) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'lvnE' put: ((Character @env0:codePoint: 8808) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'macr' put: (Character @env0:codePoint: 175) @env0:asString.
	d @env0:at: 'male' put: (Character @env0:codePoint: 9794) @env0:asString.
	d @env0:at: 'malt' put: (Character @env0:codePoint: 10016) @env0:asString.
	d @env0:at: 'maltese' put: (Character @env0:codePoint: 10016) @env0:asString.
	d @env0:at: 'Map' put: (Character @env0:codePoint: 10501) @env0:asString.
	d @env0:at: 'map' put: (Character @env0:codePoint: 8614) @env0:asString.
	d @env0:at: 'mapsto' put: (Character @env0:codePoint: 8614) @env0:asString.
	d @env0:at: 'mapstodown' put: (Character @env0:codePoint: 8615) @env0:asString.
	d @env0:at: 'mapstoleft' put: (Character @env0:codePoint: 8612) @env0:asString.
	d @env0:at: 'mapstoup' put: (Character @env0:codePoint: 8613) @env0:asString.
	d @env0:at: 'marker' put: (Character @env0:codePoint: 9646) @env0:asString.
	d @env0:at: 'mcomma' put: (Character @env0:codePoint: 10793) @env0:asString.
	d @env0:at: 'Mcy' put: (Character @env0:codePoint: 1052) @env0:asString.
	d @env0:at: 'mcy' put: (Character @env0:codePoint: 1084) @env0:asString.
	d @env0:at: 'mdash' put: (Character @env0:codePoint: 8212) @env0:asString.
	d @env0:at: 'mDDot' put: (Character @env0:codePoint: 8762) @env0:asString.
	d @env0:at: 'measuredangle' put: (Character @env0:codePoint: 8737) @env0:asString.
	d @env0:at: 'MediumSpace' put: (Character @env0:codePoint: 8287) @env0:asString.
	d @env0:at: 'Mellintrf' put: (Character @env0:codePoint: 8499) @env0:asString.
	d @env0:at: 'Mfr' put: (Character @env0:codePoint: 120080) @env0:asString.
	d @env0:at: 'mfr' put: (Character @env0:codePoint: 120106) @env0:asString.
	d @env0:at: 'mho' put: (Character @env0:codePoint: 8487) @env0:asString.
	d @env0:at: 'micro' put: (Character @env0:codePoint: 181) @env0:asString.
	d @env0:at: 'mid' put: (Character @env0:codePoint: 8739) @env0:asString.
	d @env0:at: 'midast' put: (Character @env0:codePoint: 42) @env0:asString.
	d @env0:at: 'midcir' put: (Character @env0:codePoint: 10992) @env0:asString.
	d @env0:at: 'middot' put: (Character @env0:codePoint: 183) @env0:asString.
	d @env0:at: 'minus' put: (Character @env0:codePoint: 8722) @env0:asString.
	d @env0:at: 'minusb' put: (Character @env0:codePoint: 8863) @env0:asString.
	d @env0:at: 'minusd' put: (Character @env0:codePoint: 8760) @env0:asString.
	d @env0:at: 'minusdu' put: (Character @env0:codePoint: 10794) @env0:asString.
	d @env0:at: 'MinusPlus' put: (Character @env0:codePoint: 8723) @env0:asString.
	d @env0:at: 'mlcp' put: (Character @env0:codePoint: 10971) @env0:asString.
	d @env0:at: 'mldr' put: (Character @env0:codePoint: 8230) @env0:asString.
	d @env0:at: 'mnplus' put: (Character @env0:codePoint: 8723) @env0:asString.
	d @env0:at: 'models' put: (Character @env0:codePoint: 8871) @env0:asString.
	d @env0:at: 'Mopf' put: (Character @env0:codePoint: 120132) @env0:asString.
	d @env0:at: 'mopf' put: (Character @env0:codePoint: 120158) @env0:asString.
	d @env0:at: 'mp' put: (Character @env0:codePoint: 8723) @env0:asString.
	d @env0:at: 'Mscr' put: (Character @env0:codePoint: 8499) @env0:asString.
	d @env0:at: 'mscr' put: (Character @env0:codePoint: 120002) @env0:asString.
	d @env0:at: 'mstpos' put: (Character @env0:codePoint: 8766) @env0:asString.
	d @env0:at: 'Mu' put: (Character @env0:codePoint: 924) @env0:asString.
	d @env0:at: 'mu' put: (Character @env0:codePoint: 956) @env0:asString.
	d @env0:at: 'multimap' put: (Character @env0:codePoint: 8888) @env0:asString.
	d @env0:at: 'mumap' put: (Character @env0:codePoint: 8888) @env0:asString.
	d @env0:at: 'nabla' put: (Character @env0:codePoint: 8711) @env0:asString.
	d @env0:at: 'Nacute' put: (Character @env0:codePoint: 323) @env0:asString.
	d @env0:at: 'nacute' put: (Character @env0:codePoint: 324) @env0:asString.
	d @env0:at: 'nang' put: ((Character @env0:codePoint: 8736) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nap' put: (Character @env0:codePoint: 8777) @env0:asString.
	d @env0:at: 'napE' put: ((Character @env0:codePoint: 10864) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'napid' put: ((Character @env0:codePoint: 8779) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'napos' put: (Character @env0:codePoint: 329) @env0:asString.
	d @env0:at: 'napprox' put: (Character @env0:codePoint: 8777) @env0:asString.
	d @env0:at: 'natur' put: (Character @env0:codePoint: 9838) @env0:asString.
	d @env0:at: 'natural' put: (Character @env0:codePoint: 9838) @env0:asString.
	d @env0:at: 'naturals' put: (Character @env0:codePoint: 8469) @env0:asString.
	d @env0:at: 'nbsp' put: (Character @env0:codePoint: 160) @env0:asString.
	d @env0:at: 'nbump' put: ((Character @env0:codePoint: 8782) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nbumpe' put: ((Character @env0:codePoint: 8783) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'ncap' put: (Character @env0:codePoint: 10819) @env0:asString.
	d @env0:at: 'Ncaron' put: (Character @env0:codePoint: 327) @env0:asString.
	d @env0:at: 'ncaron' put: (Character @env0:codePoint: 328) @env0:asString.
	d @env0:at: 'Ncedil' put: (Character @env0:codePoint: 325) @env0:asString.
	d @env0:at: 'ncedil' put: (Character @env0:codePoint: 326) @env0:asString.
	d @env0:at: 'ncong' put: (Character @env0:codePoint: 8775) @env0:asString.
	d @env0:at: 'ncongdot' put: ((Character @env0:codePoint: 10861) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'ncup' put: (Character @env0:codePoint: 10818) @env0:asString.
	d @env0:at: 'Ncy' put: (Character @env0:codePoint: 1053) @env0:asString.
	d @env0:at: 'ncy' put: (Character @env0:codePoint: 1085) @env0:asString.
	d @env0:at: 'ndash' put: (Character @env0:codePoint: 8211) @env0:asString.
	d @env0:at: 'ne' put: (Character @env0:codePoint: 8800) @env0:asString.
	d @env0:at: 'nearhk' put: (Character @env0:codePoint: 10532) @env0:asString.
	d @env0:at: 'neArr' put: (Character @env0:codePoint: 8663) @env0:asString.
	d @env0:at: 'nearr' put: (Character @env0:codePoint: 8599) @env0:asString.
	d @env0:at: 'nearrow' put: (Character @env0:codePoint: 8599) @env0:asString.
	d @env0:at: 'nedot' put: ((Character @env0:codePoint: 8784) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NegativeMediumSpace' put: (Character @env0:codePoint: 8203) @env0:asString.
	d @env0:at: 'NegativeThickSpace' put: (Character @env0:codePoint: 8203) @env0:asString.
	d @env0:at: 'NegativeThinSpace' put: (Character @env0:codePoint: 8203) @env0:asString.
	d @env0:at: 'NegativeVeryThinSpace' put: (Character @env0:codePoint: 8203) @env0:asString.
	d @env0:at: 'nequiv' put: (Character @env0:codePoint: 8802) @env0:asString.
	d @env0:at: 'nesear' put: (Character @env0:codePoint: 10536) @env0:asString.
	d @env0:at: 'nesim' put: ((Character @env0:codePoint: 8770) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NestedGreaterGreater' put: (Character @env0:codePoint: 8811) @env0:asString.
	d @env0:at: 'NestedLessLess' put: (Character @env0:codePoint: 8810) @env0:asString.
	d @env0:at: 'NewLine' put: (Character @env0:codePoint: 10) @env0:asString.
	d @env0:at: 'nexist' put: (Character @env0:codePoint: 8708) @env0:asString.
	d @env0:at: 'nexists' put: (Character @env0:codePoint: 8708) @env0:asString.
	d @env0:at: 'Nfr' put: (Character @env0:codePoint: 120081) @env0:asString.
	d @env0:at: 'nfr' put: (Character @env0:codePoint: 120107) @env0:asString.
	d @env0:at: 'ngE' put: ((Character @env0:codePoint: 8807) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nge' put: (Character @env0:codePoint: 8817) @env0:asString.
	d @env0:at: 'ngeq' put: (Character @env0:codePoint: 8817) @env0:asString.
	d @env0:at: 'ngeqq' put: ((Character @env0:codePoint: 8807) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'ngeqslant' put: ((Character @env0:codePoint: 10878) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nges' put: ((Character @env0:codePoint: 10878) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nGg' put: ((Character @env0:codePoint: 8921) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'ngsim' put: (Character @env0:codePoint: 8821) @env0:asString.
	d @env0:at: 'nGt' put: ((Character @env0:codePoint: 8811) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'ngt' put: (Character @env0:codePoint: 8815) @env0:asString.
	d @env0:at: 'ngtr' put: (Character @env0:codePoint: 8815) @env0:asString.
	d @env0:at: 'nGtv' put: ((Character @env0:codePoint: 8811) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nhArr' put: (Character @env0:codePoint: 8654) @env0:asString.
	d @env0:at: 'nharr' put: (Character @env0:codePoint: 8622) @env0:asString.
	d @env0:at: 'nhpar' put: (Character @env0:codePoint: 10994) @env0:asString.
	d @env0:at: 'ni' put: (Character @env0:codePoint: 8715) @env0:asString.
	d @env0:at: 'nis' put: (Character @env0:codePoint: 8956) @env0:asString.
	d @env0:at: 'nisd' put: (Character @env0:codePoint: 8954) @env0:asString.
	d @env0:at: 'niv' put: (Character @env0:codePoint: 8715) @env0:asString.
	d @env0:at: 'NJcy' put: (Character @env0:codePoint: 1034) @env0:asString.
	d @env0:at: 'njcy' put: (Character @env0:codePoint: 1114) @env0:asString.
	d @env0:at: 'nlArr' put: (Character @env0:codePoint: 8653) @env0:asString.
	d @env0:at: 'nlarr' put: (Character @env0:codePoint: 8602) @env0:asString.
	d @env0:at: 'nldr' put: (Character @env0:codePoint: 8229) @env0:asString.
	d @env0:at: 'nlE' put: ((Character @env0:codePoint: 8806) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nle' put: (Character @env0:codePoint: 8816) @env0:asString.
	d @env0:at: 'nLeftarrow' put: (Character @env0:codePoint: 8653) @env0:asString.
	d @env0:at: 'nleftarrow' put: (Character @env0:codePoint: 8602) @env0:asString.
	d @env0:at: 'nLeftrightarrow' put: (Character @env0:codePoint: 8654) @env0:asString.
	d @env0:at: 'nleftrightarrow' put: (Character @env0:codePoint: 8622) @env0:asString.
	d @env0:at: 'nleq' put: (Character @env0:codePoint: 8816) @env0:asString.
	d @env0:at: 'nleqq' put: ((Character @env0:codePoint: 8806) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nleqslant' put: ((Character @env0:codePoint: 10877) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nles' put: ((Character @env0:codePoint: 10877) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nless' put: (Character @env0:codePoint: 8814) @env0:asString.
	d @env0:at: 'nLl' put: ((Character @env0:codePoint: 8920) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nlsim' put: (Character @env0:codePoint: 8820) @env0:asString.
	d @env0:at: 'nLt' put: ((Character @env0:codePoint: 8810) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nlt' put: (Character @env0:codePoint: 8814) @env0:asString.
	d @env0:at: 'nltri' put: (Character @env0:codePoint: 8938) @env0:asString.
	d @env0:at: 'nltrie' put: (Character @env0:codePoint: 8940) @env0:asString.
	d @env0:at: 'nLtv' put: ((Character @env0:codePoint: 8810) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nmid' put: (Character @env0:codePoint: 8740) @env0:asString.
	d @env0:at: 'NoBreak' put: (Character @env0:codePoint: 8288) @env0:asString.
	d @env0:at: 'NonBreakingSpace' put: (Character @env0:codePoint: 160) @env0:asString.
	d @env0:at: 'Nopf' put: (Character @env0:codePoint: 8469) @env0:asString.
	d @env0:at: 'nopf' put: (Character @env0:codePoint: 120159) @env0:asString.
	d @env0:at: 'Not' put: (Character @env0:codePoint: 10988) @env0:asString.
	d @env0:at: 'not' put: (Character @env0:codePoint: 172) @env0:asString.
	d @env0:at: 'NotCongruent' put: (Character @env0:codePoint: 8802) @env0:asString.
	d @env0:at: 'NotCupCap' put: (Character @env0:codePoint: 8813) @env0:asString.
	d @env0:at: 'NotDoubleVerticalBar' put: (Character @env0:codePoint: 8742) @env0:asString.
	d @env0:at: 'NotElement' put: (Character @env0:codePoint: 8713) @env0:asString.
	d @env0:at: 'NotEqual' put: (Character @env0:codePoint: 8800) @env0:asString.
	d @env0:at: 'NotEqualTilde' put: ((Character @env0:codePoint: 8770) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotExists' put: (Character @env0:codePoint: 8708) @env0:asString.
	d @env0:at: 'NotGreater' put: (Character @env0:codePoint: 8815) @env0:asString.
	d @env0:at: 'NotGreaterEqual' put: (Character @env0:codePoint: 8817) @env0:asString.
	d @env0:at: 'NotGreaterFullEqual' put: ((Character @env0:codePoint: 8807) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotGreaterGreater' put: ((Character @env0:codePoint: 8811) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotGreaterLess' put: (Character @env0:codePoint: 8825) @env0:asString.
	d @env0:at: 'NotGreaterSlantEqual' put: ((Character @env0:codePoint: 10878) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotGreaterTilde' put: (Character @env0:codePoint: 8821) @env0:asString.
	d @env0:at: 'NotHumpDownHump' put: ((Character @env0:codePoint: 8782) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotHumpEqual' put: ((Character @env0:codePoint: 8783) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'notin' put: (Character @env0:codePoint: 8713) @env0:asString.
	d @env0:at: 'notindot' put: ((Character @env0:codePoint: 8949) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'notinE' put: ((Character @env0:codePoint: 8953) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'notinva' put: (Character @env0:codePoint: 8713) @env0:asString.
	d @env0:at: 'notinvb' put: (Character @env0:codePoint: 8951) @env0:asString.
	d @env0:at: 'notinvc' put: (Character @env0:codePoint: 8950) @env0:asString.
	d @env0:at: 'NotLeftTriangle' put: (Character @env0:codePoint: 8938) @env0:asString.
	d @env0:at: 'NotLeftTriangleBar' put: ((Character @env0:codePoint: 10703) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotLeftTriangleEqual' put: (Character @env0:codePoint: 8940) @env0:asString.
	d @env0:at: 'NotLess' put: (Character @env0:codePoint: 8814) @env0:asString.
	d @env0:at: 'NotLessEqual' put: (Character @env0:codePoint: 8816) @env0:asString.
	d @env0:at: 'NotLessGreater' put: (Character @env0:codePoint: 8824) @env0:asString.
	d @env0:at: 'NotLessLess' put: ((Character @env0:codePoint: 8810) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotLessSlantEqual' put: ((Character @env0:codePoint: 10877) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotLessTilde' put: (Character @env0:codePoint: 8820) @env0:asString.
	d @env0:at: 'NotNestedGreaterGreater' put: ((Character @env0:codePoint: 10914) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotNestedLessLess' put: ((Character @env0:codePoint: 10913) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'notni' put: (Character @env0:codePoint: 8716) @env0:asString.
	d @env0:at: 'notniva' put: (Character @env0:codePoint: 8716) @env0:asString.
	d @env0:at: 'notnivb' put: (Character @env0:codePoint: 8958) @env0:asString.
	d @env0:at: 'notnivc' put: (Character @env0:codePoint: 8957) @env0:asString.
	d @env0:at: 'NotPrecedes' put: (Character @env0:codePoint: 8832) @env0:asString.
	d @env0:at: 'NotPrecedesEqual' put: ((Character @env0:codePoint: 10927) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotPrecedesSlantEqual' put: (Character @env0:codePoint: 8928) @env0:asString.
	d @env0:at: 'NotReverseElement' put: (Character @env0:codePoint: 8716) @env0:asString.
	d @env0:at: 'NotRightTriangle' put: (Character @env0:codePoint: 8939) @env0:asString.
	d @env0:at: 'NotRightTriangleBar' put: ((Character @env0:codePoint: 10704) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotRightTriangleEqual' put: (Character @env0:codePoint: 8941) @env0:asString.
	d @env0:at: 'NotSquareSubset' put: ((Character @env0:codePoint: 8847) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotSquareSubsetEqual' put: (Character @env0:codePoint: 8930) @env0:asString.
	d @env0:at: 'NotSquareSuperset' put: ((Character @env0:codePoint: 8848) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotSquareSupersetEqual' put: (Character @env0:codePoint: 8931) @env0:asString.
	d @env0:at: 'NotSubset' put: ((Character @env0:codePoint: 8834) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'NotSubsetEqual' put: (Character @env0:codePoint: 8840) @env0:asString.
	d @env0:at: 'NotSucceeds' put: (Character @env0:codePoint: 8833) @env0:asString.
	d @env0:at: 'NotSucceedsEqual' put: ((Character @env0:codePoint: 10928) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotSucceedsSlantEqual' put: (Character @env0:codePoint: 8929) @env0:asString.
	d @env0:at: 'NotSucceedsTilde' put: ((Character @env0:codePoint: 8831) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'NotSuperset' put: ((Character @env0:codePoint: 8835) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'NotSupersetEqual' put: (Character @env0:codePoint: 8841) @env0:asString.
	d @env0:at: 'NotTilde' put: (Character @env0:codePoint: 8769) @env0:asString.
	d @env0:at: 'NotTildeEqual' put: (Character @env0:codePoint: 8772) @env0:asString.
	d @env0:at: 'NotTildeFullEqual' put: (Character @env0:codePoint: 8775) @env0:asString.
	d @env0:at: 'NotTildeTilde' put: (Character @env0:codePoint: 8777) @env0:asString.
	d @env0:at: 'NotVerticalBar' put: (Character @env0:codePoint: 8740) @env0:asString.
	d @env0:at: 'npar' put: (Character @env0:codePoint: 8742) @env0:asString.
	d @env0:at: 'nparallel' put: (Character @env0:codePoint: 8742) @env0:asString.
	d @env0:at: 'nparsl' put: ((Character @env0:codePoint: 11005) @env0:asString @env0:, (Character @env0:codePoint: 8421) @env0:asString).
	d @env0:at: 'npart' put: ((Character @env0:codePoint: 8706) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'npolint' put: (Character @env0:codePoint: 10772) @env0:asString.
	d @env0:at: 'npr' put: (Character @env0:codePoint: 8832) @env0:asString.
	d @env0:at: 'nprcue' put: (Character @env0:codePoint: 8928) @env0:asString.
	d @env0:at: 'npre' put: ((Character @env0:codePoint: 10927) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nprec' put: (Character @env0:codePoint: 8832) @env0:asString.
	d @env0:at: 'npreceq' put: ((Character @env0:codePoint: 10927) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nrArr' put: (Character @env0:codePoint: 8655) @env0:asString.
	d @env0:at: 'nrarr' put: (Character @env0:codePoint: 8603) @env0:asString.
	d @env0:at: 'nrarrc' put: ((Character @env0:codePoint: 10547) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nrarrw' put: ((Character @env0:codePoint: 8605) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nRightarrow' put: (Character @env0:codePoint: 8655) @env0:asString.
	d @env0:at: 'nrightarrow' put: (Character @env0:codePoint: 8603) @env0:asString.
	d @env0:at: 'nrtri' put: (Character @env0:codePoint: 8939) @env0:asString.
	d @env0:at: 'nrtrie' put: (Character @env0:codePoint: 8941) @env0:asString.
	d @env0:at: 'nsc' put: (Character @env0:codePoint: 8833) @env0:asString.
	d @env0:at: 'nsccue' put: (Character @env0:codePoint: 8929) @env0:asString.
	d @env0:at: 'nsce' put: ((Character @env0:codePoint: 10928) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'Nscr' put: (Character @env0:codePoint: 119977) @env0:asString.
	d @env0:at: 'nscr' put: (Character @env0:codePoint: 120003) @env0:asString.
	d @env0:at: 'nshortmid' put: (Character @env0:codePoint: 8740) @env0:asString.
	d @env0:at: 'nshortparallel' put: (Character @env0:codePoint: 8742) @env0:asString.
	d @env0:at: 'nsim' put: (Character @env0:codePoint: 8769) @env0:asString.
	d @env0:at: 'nsime' put: (Character @env0:codePoint: 8772) @env0:asString.
	d @env0:at: 'nsimeq' put: (Character @env0:codePoint: 8772) @env0:asString.
	d @env0:at: 'nsmid' put: (Character @env0:codePoint: 8740) @env0:asString.
	d @env0:at: 'nspar' put: (Character @env0:codePoint: 8742) @env0:asString.
	d @env0:at: 'nsqsube' put: (Character @env0:codePoint: 8930) @env0:asString.
	d @env0:at: 'nsqsupe' put: (Character @env0:codePoint: 8931) @env0:asString.
	d @env0:at: 'nsub' put: (Character @env0:codePoint: 8836) @env0:asString.
	d @env0:at: 'nsubE' put: ((Character @env0:codePoint: 10949) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nsube' put: (Character @env0:codePoint: 8840) @env0:asString.
	d @env0:at: 'nsubset' put: ((Character @env0:codePoint: 8834) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nsubseteq' put: (Character @env0:codePoint: 8840) @env0:asString.
	d @env0:at: 'nsubseteqq' put: ((Character @env0:codePoint: 10949) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nsucc' put: (Character @env0:codePoint: 8833) @env0:asString.
	d @env0:at: 'nsucceq' put: ((Character @env0:codePoint: 10928) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nsup' put: (Character @env0:codePoint: 8837) @env0:asString.
	d @env0:at: 'nsupE' put: ((Character @env0:codePoint: 10950) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'nsupe' put: (Character @env0:codePoint: 8841) @env0:asString.
	d @env0:at: 'nsupset' put: ((Character @env0:codePoint: 8835) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nsupseteq' put: (Character @env0:codePoint: 8841) @env0:asString.
	d @env0:at: 'nsupseteqq' put: ((Character @env0:codePoint: 10950) @env0:asString @env0:, (Character @env0:codePoint: 824) @env0:asString).
	d @env0:at: 'ntgl' put: (Character @env0:codePoint: 8825) @env0:asString.
	d @env0:at: 'Ntilde' put: (Character @env0:codePoint: 209) @env0:asString.
	d @env0:at: 'ntilde' put: (Character @env0:codePoint: 241) @env0:asString.
	d @env0:at: 'ntlg' put: (Character @env0:codePoint: 8824) @env0:asString.
	d @env0:at: 'ntriangleleft' put: (Character @env0:codePoint: 8938) @env0:asString.
	d @env0:at: 'ntrianglelefteq' put: (Character @env0:codePoint: 8940) @env0:asString.
	d @env0:at: 'ntriangleright' put: (Character @env0:codePoint: 8939) @env0:asString.
	d @env0:at: 'ntrianglerighteq' put: (Character @env0:codePoint: 8941) @env0:asString.
	d @env0:at: 'Nu' put: (Character @env0:codePoint: 925) @env0:asString.
	d @env0:at: 'nu' put: (Character @env0:codePoint: 957) @env0:asString.
	d @env0:at: 'num' put: (Character @env0:codePoint: 35) @env0:asString.
	d @env0:at: 'numero' put: (Character @env0:codePoint: 8470) @env0:asString.
	d @env0:at: 'numsp' put: (Character @env0:codePoint: 8199) @env0:asString.
	d @env0:at: 'nvap' put: ((Character @env0:codePoint: 8781) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nVDash' put: (Character @env0:codePoint: 8879) @env0:asString.
	d @env0:at: 'nVdash' put: (Character @env0:codePoint: 8878) @env0:asString.
	d @env0:at: 'nvDash' put: (Character @env0:codePoint: 8877) @env0:asString.
	d @env0:at: 'nvdash' put: (Character @env0:codePoint: 8876) @env0:asString.
	d @env0:at: 'nvge' put: ((Character @env0:codePoint: 8805) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nvgt' put: ((Character @env0:codePoint: 62) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nvHarr' put: (Character @env0:codePoint: 10500) @env0:asString.
	d @env0:at: 'nvinfin' put: (Character @env0:codePoint: 10718) @env0:asString.
	d @env0:at: 'nvlArr' put: (Character @env0:codePoint: 10498) @env0:asString.
	d @env0:at: 'nvle' put: ((Character @env0:codePoint: 8804) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nvlt' put: ((Character @env0:codePoint: 60) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nvltrie' put: ((Character @env0:codePoint: 8884) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nvrArr' put: (Character @env0:codePoint: 10499) @env0:asString.
	d @env0:at: 'nvrtrie' put: ((Character @env0:codePoint: 8885) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nvsim' put: ((Character @env0:codePoint: 8764) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'nwarhk' put: (Character @env0:codePoint: 10531) @env0:asString.
	d @env0:at: 'nwArr' put: (Character @env0:codePoint: 8662) @env0:asString.
	d @env0:at: 'nwarr' put: (Character @env0:codePoint: 8598) @env0:asString.
	d @env0:at: 'nwarrow' put: (Character @env0:codePoint: 8598) @env0:asString.
	d @env0:at: 'nwnear' put: (Character @env0:codePoint: 10535) @env0:asString.
	d @env0:at: 'Oacute' put: (Character @env0:codePoint: 211) @env0:asString.
	d @env0:at: 'oacute' put: (Character @env0:codePoint: 243) @env0:asString.
	d @env0:at: 'oast' put: (Character @env0:codePoint: 8859) @env0:asString.
	d @env0:at: 'ocir' put: (Character @env0:codePoint: 8858) @env0:asString.
	d @env0:at: 'Ocirc' put: (Character @env0:codePoint: 212) @env0:asString.
	d @env0:at: 'ocirc' put: (Character @env0:codePoint: 244) @env0:asString.
	d @env0:at: 'Ocy' put: (Character @env0:codePoint: 1054) @env0:asString.
	d @env0:at: 'ocy' put: (Character @env0:codePoint: 1086) @env0:asString.
	d @env0:at: 'odash' put: (Character @env0:codePoint: 8861) @env0:asString.
	d @env0:at: 'Odblac' put: (Character @env0:codePoint: 336) @env0:asString.
	d @env0:at: 'odblac' put: (Character @env0:codePoint: 337) @env0:asString.
	d @env0:at: 'odiv' put: (Character @env0:codePoint: 10808) @env0:asString.
	d @env0:at: 'odot' put: (Character @env0:codePoint: 8857) @env0:asString.
	d @env0:at: 'odsold' put: (Character @env0:codePoint: 10684) @env0:asString.
	d @env0:at: 'OElig' put: (Character @env0:codePoint: 338) @env0:asString.
	d @env0:at: 'oelig' put: (Character @env0:codePoint: 339) @env0:asString.
	d @env0:at: 'ofcir' put: (Character @env0:codePoint: 10687) @env0:asString.
	d @env0:at: 'Ofr' put: (Character @env0:codePoint: 120082) @env0:asString.
	d @env0:at: 'ofr' put: (Character @env0:codePoint: 120108) @env0:asString.
	d @env0:at: 'ogon' put: (Character @env0:codePoint: 731) @env0:asString.
	d @env0:at: 'Ograve' put: (Character @env0:codePoint: 210) @env0:asString.
	d @env0:at: 'ograve' put: (Character @env0:codePoint: 242) @env0:asString.
	d @env0:at: 'ogt' put: (Character @env0:codePoint: 10689) @env0:asString.
	d @env0:at: 'ohbar' put: (Character @env0:codePoint: 10677) @env0:asString.
	d @env0:at: 'ohm' put: (Character @env0:codePoint: 937) @env0:asString.
	d @env0:at: 'oint' put: (Character @env0:codePoint: 8750) @env0:asString.
	d @env0:at: 'olarr' put: (Character @env0:codePoint: 8634) @env0:asString.
	d @env0:at: 'olcir' put: (Character @env0:codePoint: 10686) @env0:asString.
	d @env0:at: 'olcross' put: (Character @env0:codePoint: 10683) @env0:asString.
	d @env0:at: 'oline' put: (Character @env0:codePoint: 8254) @env0:asString.
	d @env0:at: 'olt' put: (Character @env0:codePoint: 10688) @env0:asString.
	d @env0:at: 'Omacr' put: (Character @env0:codePoint: 332) @env0:asString.
	d @env0:at: 'omacr' put: (Character @env0:codePoint: 333) @env0:asString.
	d @env0:at: 'Omega' put: (Character @env0:codePoint: 937) @env0:asString.
	d @env0:at: 'omega' put: (Character @env0:codePoint: 969) @env0:asString.
	d @env0:at: 'Omicron' put: (Character @env0:codePoint: 927) @env0:asString.
	d @env0:at: 'omicron' put: (Character @env0:codePoint: 959) @env0:asString.
	d @env0:at: 'omid' put: (Character @env0:codePoint: 10678) @env0:asString.
	d @env0:at: 'ominus' put: (Character @env0:codePoint: 8854) @env0:asString.
	d @env0:at: 'Oopf' put: (Character @env0:codePoint: 120134) @env0:asString.
	d @env0:at: 'oopf' put: (Character @env0:codePoint: 120160) @env0:asString.
	d @env0:at: 'opar' put: (Character @env0:codePoint: 10679) @env0:asString.
	d @env0:at: 'OpenCurlyDoubleQuote' put: (Character @env0:codePoint: 8220) @env0:asString.
	d @env0:at: 'OpenCurlyQuote' put: (Character @env0:codePoint: 8216) @env0:asString.
	d @env0:at: 'operp' put: (Character @env0:codePoint: 10681) @env0:asString.
	d @env0:at: 'oplus' put: (Character @env0:codePoint: 8853) @env0:asString.
	d @env0:at: 'Or' put: (Character @env0:codePoint: 10836) @env0:asString.
	d @env0:at: 'or' put: (Character @env0:codePoint: 8744) @env0:asString.
	d @env0:at: 'orarr' put: (Character @env0:codePoint: 8635) @env0:asString.
	d @env0:at: 'ord' put: (Character @env0:codePoint: 10845) @env0:asString.
	d @env0:at: 'order' put: (Character @env0:codePoint: 8500) @env0:asString.
	d @env0:at: 'orderof' put: (Character @env0:codePoint: 8500) @env0:asString.
	d @env0:at: 'ordf' put: (Character @env0:codePoint: 170) @env0:asString.
	d @env0:at: 'ordm' put: (Character @env0:codePoint: 186) @env0:asString.
	d @env0:at: 'origof' put: (Character @env0:codePoint: 8886) @env0:asString.
	d @env0:at: 'oror' put: (Character @env0:codePoint: 10838) @env0:asString.
	d @env0:at: 'orslope' put: (Character @env0:codePoint: 10839) @env0:asString.
	d @env0:at: 'orv' put: (Character @env0:codePoint: 10843) @env0:asString.
	d @env0:at: 'oS' put: (Character @env0:codePoint: 9416) @env0:asString.
	d @env0:at: 'Oscr' put: (Character @env0:codePoint: 119978) @env0:asString.
	d @env0:at: 'oscr' put: (Character @env0:codePoint: 8500) @env0:asString.
	d @env0:at: 'Oslash' put: (Character @env0:codePoint: 216) @env0:asString.
	d @env0:at: 'oslash' put: (Character @env0:codePoint: 248) @env0:asString.
	d @env0:at: 'osol' put: (Character @env0:codePoint: 8856) @env0:asString.
	d @env0:at: 'Otilde' put: (Character @env0:codePoint: 213) @env0:asString.
	d @env0:at: 'otilde' put: (Character @env0:codePoint: 245) @env0:asString.
	d @env0:at: 'Otimes' put: (Character @env0:codePoint: 10807) @env0:asString.
	d @env0:at: 'otimes' put: (Character @env0:codePoint: 8855) @env0:asString.
	d @env0:at: 'otimesas' put: (Character @env0:codePoint: 10806) @env0:asString.
	d @env0:at: 'Ouml' put: (Character @env0:codePoint: 214) @env0:asString.
	d @env0:at: 'ouml' put: (Character @env0:codePoint: 246) @env0:asString.
	d @env0:at: 'ovbar' put: (Character @env0:codePoint: 9021) @env0:asString.
	d @env0:at: 'OverBar' put: (Character @env0:codePoint: 8254) @env0:asString.
	d @env0:at: 'OverBrace' put: (Character @env0:codePoint: 9182) @env0:asString.
	d @env0:at: 'OverBracket' put: (Character @env0:codePoint: 9140) @env0:asString.
	d @env0:at: 'OverParenthesis' put: (Character @env0:codePoint: 9180) @env0:asString.
	d @env0:at: 'par' put: (Character @env0:codePoint: 8741) @env0:asString.
	d @env0:at: 'para' put: (Character @env0:codePoint: 182) @env0:asString.
	d @env0:at: 'parallel' put: (Character @env0:codePoint: 8741) @env0:asString.
	d @env0:at: 'parsim' put: (Character @env0:codePoint: 10995) @env0:asString.
	d @env0:at: 'parsl' put: (Character @env0:codePoint: 11005) @env0:asString.
	d @env0:at: 'part' put: (Character @env0:codePoint: 8706) @env0:asString.
	d @env0:at: 'PartialD' put: (Character @env0:codePoint: 8706) @env0:asString.
	d @env0:at: 'Pcy' put: (Character @env0:codePoint: 1055) @env0:asString.
	d @env0:at: 'pcy' put: (Character @env0:codePoint: 1087) @env0:asString.
	d @env0:at: 'percnt' put: (Character @env0:codePoint: 37) @env0:asString.
	d @env0:at: 'period' put: (Character @env0:codePoint: 46) @env0:asString.
	d @env0:at: 'permil' put: (Character @env0:codePoint: 8240) @env0:asString.
	d @env0:at: 'perp' put: (Character @env0:codePoint: 8869) @env0:asString.
	d @env0:at: 'pertenk' put: (Character @env0:codePoint: 8241) @env0:asString.
	d @env0:at: 'Pfr' put: (Character @env0:codePoint: 120083) @env0:asString.
	d @env0:at: 'pfr' put: (Character @env0:codePoint: 120109) @env0:asString.
	d @env0:at: 'Phi' put: (Character @env0:codePoint: 934) @env0:asString.
	d @env0:at: 'phi' put: (Character @env0:codePoint: 966) @env0:asString.
	d @env0:at: 'phiv' put: (Character @env0:codePoint: 981) @env0:asString.
	d @env0:at: 'phmmat' put: (Character @env0:codePoint: 8499) @env0:asString.
	d @env0:at: 'phone' put: (Character @env0:codePoint: 9742) @env0:asString.
	d @env0:at: 'Pi' put: (Character @env0:codePoint: 928) @env0:asString.
	d @env0:at: 'pi' put: (Character @env0:codePoint: 960) @env0:asString.
	d @env0:at: 'pitchfork' put: (Character @env0:codePoint: 8916) @env0:asString.
	d @env0:at: 'piv' put: (Character @env0:codePoint: 982) @env0:asString.
	d @env0:at: 'planck' put: (Character @env0:codePoint: 8463) @env0:asString.
	d @env0:at: 'planckh' put: (Character @env0:codePoint: 8462) @env0:asString.
	d @env0:at: 'plankv' put: (Character @env0:codePoint: 8463) @env0:asString.
	d @env0:at: 'plus' put: (Character @env0:codePoint: 43) @env0:asString.
	d @env0:at: 'plusacir' put: (Character @env0:codePoint: 10787) @env0:asString.
	d @env0:at: 'plusb' put: (Character @env0:codePoint: 8862) @env0:asString.
	d @env0:at: 'pluscir' put: (Character @env0:codePoint: 10786) @env0:asString.
	d @env0:at: 'plusdo' put: (Character @env0:codePoint: 8724) @env0:asString.
	d @env0:at: 'plusdu' put: (Character @env0:codePoint: 10789) @env0:asString.
	d @env0:at: 'pluse' put: (Character @env0:codePoint: 10866) @env0:asString.
	d @env0:at: 'PlusMinus' put: (Character @env0:codePoint: 177) @env0:asString.
	d @env0:at: 'plusmn' put: (Character @env0:codePoint: 177) @env0:asString.
	d @env0:at: 'plussim' put: (Character @env0:codePoint: 10790) @env0:asString.
	d @env0:at: 'plustwo' put: (Character @env0:codePoint: 10791) @env0:asString.
	d @env0:at: 'pm' put: (Character @env0:codePoint: 177) @env0:asString.
	d @env0:at: 'Poincareplane' put: (Character @env0:codePoint: 8460) @env0:asString.
	d @env0:at: 'pointint' put: (Character @env0:codePoint: 10773) @env0:asString.
	d @env0:at: 'Popf' put: (Character @env0:codePoint: 8473) @env0:asString.
	d @env0:at: 'popf' put: (Character @env0:codePoint: 120161) @env0:asString.
	d @env0:at: 'pound' put: (Character @env0:codePoint: 163) @env0:asString.
	d @env0:at: 'Pr' put: (Character @env0:codePoint: 10939) @env0:asString.
	d @env0:at: 'pr' put: (Character @env0:codePoint: 8826) @env0:asString.
	d @env0:at: 'prap' put: (Character @env0:codePoint: 10935) @env0:asString.
	d @env0:at: 'prcue' put: (Character @env0:codePoint: 8828) @env0:asString.
	d @env0:at: 'prE' put: (Character @env0:codePoint: 10931) @env0:asString.
	d @env0:at: 'pre' put: (Character @env0:codePoint: 10927) @env0:asString.
	d @env0:at: 'prec' put: (Character @env0:codePoint: 8826) @env0:asString.
	d @env0:at: 'precapprox' put: (Character @env0:codePoint: 10935) @env0:asString.
	d @env0:at: 'preccurlyeq' put: (Character @env0:codePoint: 8828) @env0:asString.
	d @env0:at: 'Precedes' put: (Character @env0:codePoint: 8826) @env0:asString.
	d @env0:at: 'PrecedesEqual' put: (Character @env0:codePoint: 10927) @env0:asString.
	d @env0:at: 'PrecedesSlantEqual' put: (Character @env0:codePoint: 8828) @env0:asString.
	d @env0:at: 'PrecedesTilde' put: (Character @env0:codePoint: 8830) @env0:asString.
	d @env0:at: 'preceq' put: (Character @env0:codePoint: 10927) @env0:asString.
	d @env0:at: 'precnapprox' put: (Character @env0:codePoint: 10937) @env0:asString.
	d @env0:at: 'precneqq' put: (Character @env0:codePoint: 10933) @env0:asString.
	d @env0:at: 'precnsim' put: (Character @env0:codePoint: 8936) @env0:asString.
	d @env0:at: 'precsim' put: (Character @env0:codePoint: 8830) @env0:asString.
	d @env0:at: 'Prime' put: (Character @env0:codePoint: 8243) @env0:asString.
	d @env0:at: 'prime' put: (Character @env0:codePoint: 8242) @env0:asString.
	d @env0:at: 'primes' put: (Character @env0:codePoint: 8473) @env0:asString.
	d @env0:at: 'prnap' put: (Character @env0:codePoint: 10937) @env0:asString.
	d @env0:at: 'prnE' put: (Character @env0:codePoint: 10933) @env0:asString.
	d @env0:at: 'prnsim' put: (Character @env0:codePoint: 8936) @env0:asString.
	d @env0:at: 'prod' put: (Character @env0:codePoint: 8719) @env0:asString.
	d @env0:at: 'Product' put: (Character @env0:codePoint: 8719) @env0:asString.
	d @env0:at: 'profalar' put: (Character @env0:codePoint: 9006) @env0:asString.
	d @env0:at: 'profline' put: (Character @env0:codePoint: 8978) @env0:asString.
	d @env0:at: 'profsurf' put: (Character @env0:codePoint: 8979) @env0:asString.
	d @env0:at: 'prop' put: (Character @env0:codePoint: 8733) @env0:asString.
	d @env0:at: 'Proportion' put: (Character @env0:codePoint: 8759) @env0:asString.
	d @env0:at: 'Proportional' put: (Character @env0:codePoint: 8733) @env0:asString.
	d @env0:at: 'propto' put: (Character @env0:codePoint: 8733) @env0:asString.
	d @env0:at: 'prsim' put: (Character @env0:codePoint: 8830) @env0:asString.
	d @env0:at: 'prurel' put: (Character @env0:codePoint: 8880) @env0:asString.
	d @env0:at: 'Pscr' put: (Character @env0:codePoint: 119979) @env0:asString.
	d @env0:at: 'pscr' put: (Character @env0:codePoint: 120005) @env0:asString.
	d @env0:at: 'Psi' put: (Character @env0:codePoint: 936) @env0:asString.
	d @env0:at: 'psi' put: (Character @env0:codePoint: 968) @env0:asString.
	d @env0:at: 'puncsp' put: (Character @env0:codePoint: 8200) @env0:asString.
	d @env0:at: 'Qfr' put: (Character @env0:codePoint: 120084) @env0:asString.
	d @env0:at: 'qfr' put: (Character @env0:codePoint: 120110) @env0:asString.
	d @env0:at: 'qint' put: (Character @env0:codePoint: 10764) @env0:asString.
	d @env0:at: 'Qopf' put: (Character @env0:codePoint: 8474) @env0:asString.
	d @env0:at: 'qopf' put: (Character @env0:codePoint: 120162) @env0:asString.
	d @env0:at: 'qprime' put: (Character @env0:codePoint: 8279) @env0:asString.
	d @env0:at: 'Qscr' put: (Character @env0:codePoint: 119980) @env0:asString.
	d @env0:at: 'qscr' put: (Character @env0:codePoint: 120006) @env0:asString.
	d @env0:at: 'quaternions' put: (Character @env0:codePoint: 8461) @env0:asString.
	d @env0:at: 'quatint' put: (Character @env0:codePoint: 10774) @env0:asString.
	d @env0:at: 'quest' put: (Character @env0:codePoint: 63) @env0:asString.
	d @env0:at: 'questeq' put: (Character @env0:codePoint: 8799) @env0:asString.
	d @env0:at: 'QUOT' put: (Character @env0:codePoint: 34) @env0:asString.
	d @env0:at: 'quot' put: (Character @env0:codePoint: 34) @env0:asString.
	d @env0:at: 'rAarr' put: (Character @env0:codePoint: 8667) @env0:asString.
	d @env0:at: 'race' put: ((Character @env0:codePoint: 8765) @env0:asString @env0:, (Character @env0:codePoint: 817) @env0:asString).
	d @env0:at: 'Racute' put: (Character @env0:codePoint: 340) @env0:asString.
	d @env0:at: 'racute' put: (Character @env0:codePoint: 341) @env0:asString.
	d @env0:at: 'radic' put: (Character @env0:codePoint: 8730) @env0:asString.
	d @env0:at: 'raemptyv' put: (Character @env0:codePoint: 10675) @env0:asString.
	d @env0:at: 'Rang' put: (Character @env0:codePoint: 10219) @env0:asString.
	d @env0:at: 'rang' put: (Character @env0:codePoint: 10217) @env0:asString.
	d @env0:at: 'rangd' put: (Character @env0:codePoint: 10642) @env0:asString.
	d @env0:at: 'range' put: (Character @env0:codePoint: 10661) @env0:asString.
	d @env0:at: 'rangle' put: (Character @env0:codePoint: 10217) @env0:asString.
	d @env0:at: 'raquo' put: (Character @env0:codePoint: 187) @env0:asString.
	d @env0:at: 'Rarr' put: (Character @env0:codePoint: 8608) @env0:asString.
	d @env0:at: 'rArr' put: (Character @env0:codePoint: 8658) @env0:asString.
	d @env0:at: 'rarr' put: (Character @env0:codePoint: 8594) @env0:asString.
	d @env0:at: 'rarrap' put: (Character @env0:codePoint: 10613) @env0:asString.
	d @env0:at: 'rarrb' put: (Character @env0:codePoint: 8677) @env0:asString.
	d @env0:at: 'rarrbfs' put: (Character @env0:codePoint: 10528) @env0:asString.
	d @env0:at: 'rarrc' put: (Character @env0:codePoint: 10547) @env0:asString.
	d @env0:at: 'rarrfs' put: (Character @env0:codePoint: 10526) @env0:asString.
	d @env0:at: 'rarrhk' put: (Character @env0:codePoint: 8618) @env0:asString.
	d @env0:at: 'rarrlp' put: (Character @env0:codePoint: 8620) @env0:asString.
	d @env0:at: 'rarrpl' put: (Character @env0:codePoint: 10565) @env0:asString.
	d @env0:at: 'rarrsim' put: (Character @env0:codePoint: 10612) @env0:asString.
	d @env0:at: 'Rarrtl' put: (Character @env0:codePoint: 10518) @env0:asString.
	d @env0:at: 'rarrtl' put: (Character @env0:codePoint: 8611) @env0:asString.
	d @env0:at: 'rarrw' put: (Character @env0:codePoint: 8605) @env0:asString.
	d @env0:at: 'rAtail' put: (Character @env0:codePoint: 10524) @env0:asString.
	d @env0:at: 'ratail' put: (Character @env0:codePoint: 10522) @env0:asString.
	d @env0:at: 'ratio' put: (Character @env0:codePoint: 8758) @env0:asString.
	d @env0:at: 'rationals' put: (Character @env0:codePoint: 8474) @env0:asString.
	d @env0:at: 'RBarr' put: (Character @env0:codePoint: 10512) @env0:asString.
	d @env0:at: 'rBarr' put: (Character @env0:codePoint: 10511) @env0:asString.
	d @env0:at: 'rbarr' put: (Character @env0:codePoint: 10509) @env0:asString.
	d @env0:at: 'rbbrk' put: (Character @env0:codePoint: 10099) @env0:asString.
	d @env0:at: 'rbrace' put: (Character @env0:codePoint: 125) @env0:asString.
	d @env0:at: 'rbrack' put: (Character @env0:codePoint: 93) @env0:asString.
	d @env0:at: 'rbrke' put: (Character @env0:codePoint: 10636) @env0:asString.
	d @env0:at: 'rbrksld' put: (Character @env0:codePoint: 10638) @env0:asString.
	d @env0:at: 'rbrkslu' put: (Character @env0:codePoint: 10640) @env0:asString.
	d @env0:at: 'Rcaron' put: (Character @env0:codePoint: 344) @env0:asString.
	d @env0:at: 'rcaron' put: (Character @env0:codePoint: 345) @env0:asString.
	d @env0:at: 'Rcedil' put: (Character @env0:codePoint: 342) @env0:asString.
	d @env0:at: 'rcedil' put: (Character @env0:codePoint: 343) @env0:asString.
	d @env0:at: 'rceil' put: (Character @env0:codePoint: 8969) @env0:asString.
	d @env0:at: 'rcub' put: (Character @env0:codePoint: 125) @env0:asString.
	d @env0:at: 'Rcy' put: (Character @env0:codePoint: 1056) @env0:asString.
	d @env0:at: 'rcy' put: (Character @env0:codePoint: 1088) @env0:asString.
	d @env0:at: 'rdca' put: (Character @env0:codePoint: 10551) @env0:asString.
	d @env0:at: 'rdldhar' put: (Character @env0:codePoint: 10601) @env0:asString.
	d @env0:at: 'rdquo' put: (Character @env0:codePoint: 8221) @env0:asString.
	d @env0:at: 'rdquor' put: (Character @env0:codePoint: 8221) @env0:asString.
	d @env0:at: 'rdsh' put: (Character @env0:codePoint: 8627) @env0:asString.
	d @env0:at: 'Re' put: (Character @env0:codePoint: 8476) @env0:asString.
	d @env0:at: 'real' put: (Character @env0:codePoint: 8476) @env0:asString.
	d @env0:at: 'realine' put: (Character @env0:codePoint: 8475) @env0:asString.
	d @env0:at: 'realpart' put: (Character @env0:codePoint: 8476) @env0:asString.
	d @env0:at: 'reals' put: (Character @env0:codePoint: 8477) @env0:asString.
	d @env0:at: 'rect' put: (Character @env0:codePoint: 9645) @env0:asString.
	d @env0:at: 'REG' put: (Character @env0:codePoint: 174) @env0:asString.
	d @env0:at: 'reg' put: (Character @env0:codePoint: 174) @env0:asString.
	d @env0:at: 'ReverseElement' put: (Character @env0:codePoint: 8715) @env0:asString.
	d @env0:at: 'ReverseEquilibrium' put: (Character @env0:codePoint: 8651) @env0:asString.
	d @env0:at: 'ReverseUpEquilibrium' put: (Character @env0:codePoint: 10607) @env0:asString.
	d @env0:at: 'rfisht' put: (Character @env0:codePoint: 10621) @env0:asString.
	d @env0:at: 'rfloor' put: (Character @env0:codePoint: 8971) @env0:asString.
	d @env0:at: 'Rfr' put: (Character @env0:codePoint: 8476) @env0:asString.
	d @env0:at: 'rfr' put: (Character @env0:codePoint: 120111) @env0:asString.
	d @env0:at: 'rHar' put: (Character @env0:codePoint: 10596) @env0:asString.
	d @env0:at: 'rhard' put: (Character @env0:codePoint: 8641) @env0:asString.
	d @env0:at: 'rharu' put: (Character @env0:codePoint: 8640) @env0:asString.
	d @env0:at: 'rharul' put: (Character @env0:codePoint: 10604) @env0:asString.
	d @env0:at: 'Rho' put: (Character @env0:codePoint: 929) @env0:asString.
	d @env0:at: 'rho' put: (Character @env0:codePoint: 961) @env0:asString.
	d @env0:at: 'rhov' put: (Character @env0:codePoint: 1009) @env0:asString.
	d @env0:at: 'RightAngleBracket' put: (Character @env0:codePoint: 10217) @env0:asString.
	d @env0:at: 'RightArrow' put: (Character @env0:codePoint: 8594) @env0:asString.
	d @env0:at: 'Rightarrow' put: (Character @env0:codePoint: 8658) @env0:asString.
	d @env0:at: 'rightarrow' put: (Character @env0:codePoint: 8594) @env0:asString.
	d @env0:at: 'RightArrowBar' put: (Character @env0:codePoint: 8677) @env0:asString.
	d @env0:at: 'RightArrowLeftArrow' put: (Character @env0:codePoint: 8644) @env0:asString.
	d @env0:at: 'rightarrowtail' put: (Character @env0:codePoint: 8611) @env0:asString.
	d @env0:at: 'RightCeiling' put: (Character @env0:codePoint: 8969) @env0:asString.
	d @env0:at: 'RightDoubleBracket' put: (Character @env0:codePoint: 10215) @env0:asString.
	d @env0:at: 'RightDownTeeVector' put: (Character @env0:codePoint: 10589) @env0:asString.
	d @env0:at: 'RightDownVector' put: (Character @env0:codePoint: 8642) @env0:asString.
	d @env0:at: 'RightDownVectorBar' put: (Character @env0:codePoint: 10581) @env0:asString.
	d @env0:at: 'RightFloor' put: (Character @env0:codePoint: 8971) @env0:asString.
	d @env0:at: 'rightharpoondown' put: (Character @env0:codePoint: 8641) @env0:asString.
	d @env0:at: 'rightharpoonup' put: (Character @env0:codePoint: 8640) @env0:asString.
	d @env0:at: 'rightleftarrows' put: (Character @env0:codePoint: 8644) @env0:asString.
	d @env0:at: 'rightleftharpoons' put: (Character @env0:codePoint: 8652) @env0:asString.
	d @env0:at: 'rightrightarrows' put: (Character @env0:codePoint: 8649) @env0:asString.
	d @env0:at: 'rightsquigarrow' put: (Character @env0:codePoint: 8605) @env0:asString.
	d @env0:at: 'RightTee' put: (Character @env0:codePoint: 8866) @env0:asString.
	d @env0:at: 'RightTeeArrow' put: (Character @env0:codePoint: 8614) @env0:asString.
	d @env0:at: 'RightTeeVector' put: (Character @env0:codePoint: 10587) @env0:asString.
	d @env0:at: 'rightthreetimes' put: (Character @env0:codePoint: 8908) @env0:asString.
	d @env0:at: 'RightTriangle' put: (Character @env0:codePoint: 8883) @env0:asString.
	d @env0:at: 'RightTriangleBar' put: (Character @env0:codePoint: 10704) @env0:asString.
	d @env0:at: 'RightTriangleEqual' put: (Character @env0:codePoint: 8885) @env0:asString.
	d @env0:at: 'RightUpDownVector' put: (Character @env0:codePoint: 10575) @env0:asString.
	d @env0:at: 'RightUpTeeVector' put: (Character @env0:codePoint: 10588) @env0:asString.
	d @env0:at: 'RightUpVector' put: (Character @env0:codePoint: 8638) @env0:asString.
	d @env0:at: 'RightUpVectorBar' put: (Character @env0:codePoint: 10580) @env0:asString.
	d @env0:at: 'RightVector' put: (Character @env0:codePoint: 8640) @env0:asString.
	d @env0:at: 'RightVectorBar' put: (Character @env0:codePoint: 10579) @env0:asString.
	d @env0:at: 'ring' put: (Character @env0:codePoint: 730) @env0:asString.
	d @env0:at: 'risingdotseq' put: (Character @env0:codePoint: 8787) @env0:asString.
	d @env0:at: 'rlarr' put: (Character @env0:codePoint: 8644) @env0:asString.
	d @env0:at: 'rlhar' put: (Character @env0:codePoint: 8652) @env0:asString.
	d @env0:at: 'rlm' put: (Character @env0:codePoint: 8207) @env0:asString.
	d @env0:at: 'rmoust' put: (Character @env0:codePoint: 9137) @env0:asString.
	d @env0:at: 'rmoustache' put: (Character @env0:codePoint: 9137) @env0:asString.
	d @env0:at: 'rnmid' put: (Character @env0:codePoint: 10990) @env0:asString.
	d @env0:at: 'roang' put: (Character @env0:codePoint: 10221) @env0:asString.
	d @env0:at: 'roarr' put: (Character @env0:codePoint: 8702) @env0:asString.
	d @env0:at: 'robrk' put: (Character @env0:codePoint: 10215) @env0:asString.
	d @env0:at: 'ropar' put: (Character @env0:codePoint: 10630) @env0:asString.
	d @env0:at: 'Ropf' put: (Character @env0:codePoint: 8477) @env0:asString.
	d @env0:at: 'ropf' put: (Character @env0:codePoint: 120163) @env0:asString.
	d @env0:at: 'roplus' put: (Character @env0:codePoint: 10798) @env0:asString.
	d @env0:at: 'rotimes' put: (Character @env0:codePoint: 10805) @env0:asString.
	d @env0:at: 'RoundImplies' put: (Character @env0:codePoint: 10608) @env0:asString.
	d @env0:at: 'rpar' put: (Character @env0:codePoint: 41) @env0:asString.
	d @env0:at: 'rpargt' put: (Character @env0:codePoint: 10644) @env0:asString.
	d @env0:at: 'rppolint' put: (Character @env0:codePoint: 10770) @env0:asString.
	d @env0:at: 'rrarr' put: (Character @env0:codePoint: 8649) @env0:asString.
	d @env0:at: 'Rrightarrow' put: (Character @env0:codePoint: 8667) @env0:asString.
	d @env0:at: 'rsaquo' put: (Character @env0:codePoint: 8250) @env0:asString.
	d @env0:at: 'Rscr' put: (Character @env0:codePoint: 8475) @env0:asString.
	d @env0:at: 'rscr' put: (Character @env0:codePoint: 120007) @env0:asString.
	d @env0:at: 'Rsh' put: (Character @env0:codePoint: 8625) @env0:asString.
	d @env0:at: 'rsh' put: (Character @env0:codePoint: 8625) @env0:asString.
	d @env0:at: 'rsqb' put: (Character @env0:codePoint: 93) @env0:asString.
	d @env0:at: 'rsquo' put: (Character @env0:codePoint: 8217) @env0:asString.
	d @env0:at: 'rsquor' put: (Character @env0:codePoint: 8217) @env0:asString.
	d @env0:at: 'rthree' put: (Character @env0:codePoint: 8908) @env0:asString.
	d @env0:at: 'rtimes' put: (Character @env0:codePoint: 8906) @env0:asString.
	d @env0:at: 'rtri' put: (Character @env0:codePoint: 9657) @env0:asString.
	d @env0:at: 'rtrie' put: (Character @env0:codePoint: 8885) @env0:asString.
	d @env0:at: 'rtrif' put: (Character @env0:codePoint: 9656) @env0:asString.
	d @env0:at: 'rtriltri' put: (Character @env0:codePoint: 10702) @env0:asString.
	d @env0:at: 'RuleDelayed' put: (Character @env0:codePoint: 10740) @env0:asString.
	d @env0:at: 'ruluhar' put: (Character @env0:codePoint: 10600) @env0:asString.
	d @env0:at: 'rx' put: (Character @env0:codePoint: 8478) @env0:asString.
	d @env0:at: 'Sacute' put: (Character @env0:codePoint: 346) @env0:asString.
	d @env0:at: 'sacute' put: (Character @env0:codePoint: 347) @env0:asString.
	d @env0:at: 'sbquo' put: (Character @env0:codePoint: 8218) @env0:asString.
	d @env0:at: 'Sc' put: (Character @env0:codePoint: 10940) @env0:asString.
	d @env0:at: 'sc' put: (Character @env0:codePoint: 8827) @env0:asString.
	d @env0:at: 'scap' put: (Character @env0:codePoint: 10936) @env0:asString.
	d @env0:at: 'Scaron' put: (Character @env0:codePoint: 352) @env0:asString.
	d @env0:at: 'scaron' put: (Character @env0:codePoint: 353) @env0:asString.
	d @env0:at: 'sccue' put: (Character @env0:codePoint: 8829) @env0:asString.
	d @env0:at: 'scE' put: (Character @env0:codePoint: 10932) @env0:asString.
	d @env0:at: 'sce' put: (Character @env0:codePoint: 10928) @env0:asString.
	d @env0:at: 'Scedil' put: (Character @env0:codePoint: 350) @env0:asString.
	d @env0:at: 'scedil' put: (Character @env0:codePoint: 351) @env0:asString.
	d @env0:at: 'Scirc' put: (Character @env0:codePoint: 348) @env0:asString.
	d @env0:at: 'scirc' put: (Character @env0:codePoint: 349) @env0:asString.
	d @env0:at: 'scnap' put: (Character @env0:codePoint: 10938) @env0:asString.
	d @env0:at: 'scnE' put: (Character @env0:codePoint: 10934) @env0:asString.
	d @env0:at: 'scnsim' put: (Character @env0:codePoint: 8937) @env0:asString.
	d @env0:at: 'scpolint' put: (Character @env0:codePoint: 10771) @env0:asString.
	d @env0:at: 'scsim' put: (Character @env0:codePoint: 8831) @env0:asString.
	d @env0:at: 'Scy' put: (Character @env0:codePoint: 1057) @env0:asString.
	d @env0:at: 'scy' put: (Character @env0:codePoint: 1089) @env0:asString.
	d @env0:at: 'sdot' put: (Character @env0:codePoint: 8901) @env0:asString.
	d @env0:at: 'sdotb' put: (Character @env0:codePoint: 8865) @env0:asString.
	d @env0:at: 'sdote' put: (Character @env0:codePoint: 10854) @env0:asString.
	d @env0:at: 'searhk' put: (Character @env0:codePoint: 10533) @env0:asString.
	d @env0:at: 'seArr' put: (Character @env0:codePoint: 8664) @env0:asString.
	d @env0:at: 'searr' put: (Character @env0:codePoint: 8600) @env0:asString.
	d @env0:at: 'searrow' put: (Character @env0:codePoint: 8600) @env0:asString.
	d @env0:at: 'sect' put: (Character @env0:codePoint: 167) @env0:asString.
	d @env0:at: 'semi' put: (Character @env0:codePoint: 59) @env0:asString.
	d @env0:at: 'seswar' put: (Character @env0:codePoint: 10537) @env0:asString.
	d @env0:at: 'setminus' put: (Character @env0:codePoint: 8726) @env0:asString.
	d @env0:at: 'setmn' put: (Character @env0:codePoint: 8726) @env0:asString.
	d @env0:at: 'sext' put: (Character @env0:codePoint: 10038) @env0:asString.
	d @env0:at: 'Sfr' put: (Character @env0:codePoint: 120086) @env0:asString.
	d @env0:at: 'sfr' put: (Character @env0:codePoint: 120112) @env0:asString.
	d @env0:at: 'sfrown' put: (Character @env0:codePoint: 8994) @env0:asString.
	d @env0:at: 'sharp' put: (Character @env0:codePoint: 9839) @env0:asString.
	d @env0:at: 'SHCHcy' put: (Character @env0:codePoint: 1065) @env0:asString.
	d @env0:at: 'shchcy' put: (Character @env0:codePoint: 1097) @env0:asString.
	d @env0:at: 'SHcy' put: (Character @env0:codePoint: 1064) @env0:asString.
	d @env0:at: 'shcy' put: (Character @env0:codePoint: 1096) @env0:asString.
	d @env0:at: 'ShortDownArrow' put: (Character @env0:codePoint: 8595) @env0:asString.
	d @env0:at: 'ShortLeftArrow' put: (Character @env0:codePoint: 8592) @env0:asString.
	d @env0:at: 'shortmid' put: (Character @env0:codePoint: 8739) @env0:asString.
	d @env0:at: 'shortparallel' put: (Character @env0:codePoint: 8741) @env0:asString.
	d @env0:at: 'ShortRightArrow' put: (Character @env0:codePoint: 8594) @env0:asString.
	d @env0:at: 'ShortUpArrow' put: (Character @env0:codePoint: 8593) @env0:asString.
	d @env0:at: 'shy' put: (Character @env0:codePoint: 173) @env0:asString.
	d @env0:at: 'Sigma' put: (Character @env0:codePoint: 931) @env0:asString.
	d @env0:at: 'sigma' put: (Character @env0:codePoint: 963) @env0:asString.
	d @env0:at: 'sigmaf' put: (Character @env0:codePoint: 962) @env0:asString.
	d @env0:at: 'sigmav' put: (Character @env0:codePoint: 962) @env0:asString.
	d @env0:at: 'sim' put: (Character @env0:codePoint: 8764) @env0:asString.
	d @env0:at: 'simdot' put: (Character @env0:codePoint: 10858) @env0:asString.
	d @env0:at: 'sime' put: (Character @env0:codePoint: 8771) @env0:asString.
	d @env0:at: 'simeq' put: (Character @env0:codePoint: 8771) @env0:asString.
	d @env0:at: 'simg' put: (Character @env0:codePoint: 10910) @env0:asString.
	d @env0:at: 'simgE' put: (Character @env0:codePoint: 10912) @env0:asString.
	d @env0:at: 'siml' put: (Character @env0:codePoint: 10909) @env0:asString.
	d @env0:at: 'simlE' put: (Character @env0:codePoint: 10911) @env0:asString.
	d @env0:at: 'simne' put: (Character @env0:codePoint: 8774) @env0:asString.
	d @env0:at: 'simplus' put: (Character @env0:codePoint: 10788) @env0:asString.
	d @env0:at: 'simrarr' put: (Character @env0:codePoint: 10610) @env0:asString.
	d @env0:at: 'slarr' put: (Character @env0:codePoint: 8592) @env0:asString.
	d @env0:at: 'SmallCircle' put: (Character @env0:codePoint: 8728) @env0:asString.
	d @env0:at: 'smallsetminus' put: (Character @env0:codePoint: 8726) @env0:asString.
	d @env0:at: 'smashp' put: (Character @env0:codePoint: 10803) @env0:asString.
	d @env0:at: 'smeparsl' put: (Character @env0:codePoint: 10724) @env0:asString.
	d @env0:at: 'smid' put: (Character @env0:codePoint: 8739) @env0:asString.
	d @env0:at: 'smile' put: (Character @env0:codePoint: 8995) @env0:asString.
	d @env0:at: 'smt' put: (Character @env0:codePoint: 10922) @env0:asString.
	d @env0:at: 'smte' put: (Character @env0:codePoint: 10924) @env0:asString.
	d @env0:at: 'smtes' put: ((Character @env0:codePoint: 10924) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'SOFTcy' put: (Character @env0:codePoint: 1068) @env0:asString.
	d @env0:at: 'softcy' put: (Character @env0:codePoint: 1100) @env0:asString.
	d @env0:at: 'sol' put: (Character @env0:codePoint: 47) @env0:asString.
	d @env0:at: 'solb' put: (Character @env0:codePoint: 10692) @env0:asString.
	d @env0:at: 'solbar' put: (Character @env0:codePoint: 9023) @env0:asString.
	d @env0:at: 'Sopf' put: (Character @env0:codePoint: 120138) @env0:asString.
	d @env0:at: 'sopf' put: (Character @env0:codePoint: 120164) @env0:asString.
	d @env0:at: 'spades' put: (Character @env0:codePoint: 9824) @env0:asString.
	d @env0:at: 'spadesuit' put: (Character @env0:codePoint: 9824) @env0:asString.
	d @env0:at: 'spar' put: (Character @env0:codePoint: 8741) @env0:asString.
	d @env0:at: 'sqcap' put: (Character @env0:codePoint: 8851) @env0:asString.
	d @env0:at: 'sqcaps' put: ((Character @env0:codePoint: 8851) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'sqcup' put: (Character @env0:codePoint: 8852) @env0:asString.
	d @env0:at: 'sqcups' put: ((Character @env0:codePoint: 8852) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'Sqrt' put: (Character @env0:codePoint: 8730) @env0:asString.
	d @env0:at: 'sqsub' put: (Character @env0:codePoint: 8847) @env0:asString.
	d @env0:at: 'sqsube' put: (Character @env0:codePoint: 8849) @env0:asString.
	d @env0:at: 'sqsubset' put: (Character @env0:codePoint: 8847) @env0:asString.
	d @env0:at: 'sqsubseteq' put: (Character @env0:codePoint: 8849) @env0:asString.
	d @env0:at: 'sqsup' put: (Character @env0:codePoint: 8848) @env0:asString.
	d @env0:at: 'sqsupe' put: (Character @env0:codePoint: 8850) @env0:asString.
	d @env0:at: 'sqsupset' put: (Character @env0:codePoint: 8848) @env0:asString.
	d @env0:at: 'sqsupseteq' put: (Character @env0:codePoint: 8850) @env0:asString.
	d @env0:at: 'squ' put: (Character @env0:codePoint: 9633) @env0:asString.
	d @env0:at: 'Square' put: (Character @env0:codePoint: 9633) @env0:asString.
	d @env0:at: 'square' put: (Character @env0:codePoint: 9633) @env0:asString.
	d @env0:at: 'SquareIntersection' put: (Character @env0:codePoint: 8851) @env0:asString.
	d @env0:at: 'SquareSubset' put: (Character @env0:codePoint: 8847) @env0:asString.
	d @env0:at: 'SquareSubsetEqual' put: (Character @env0:codePoint: 8849) @env0:asString.
	d @env0:at: 'SquareSuperset' put: (Character @env0:codePoint: 8848) @env0:asString.
	d @env0:at: 'SquareSupersetEqual' put: (Character @env0:codePoint: 8850) @env0:asString.
	d @env0:at: 'SquareUnion' put: (Character @env0:codePoint: 8852) @env0:asString.
	d @env0:at: 'squarf' put: (Character @env0:codePoint: 9642) @env0:asString.
	d @env0:at: 'squf' put: (Character @env0:codePoint: 9642) @env0:asString.
	d @env0:at: 'srarr' put: (Character @env0:codePoint: 8594) @env0:asString.
	d @env0:at: 'Sscr' put: (Character @env0:codePoint: 119982) @env0:asString.
	d @env0:at: 'sscr' put: (Character @env0:codePoint: 120008) @env0:asString.
	d @env0:at: 'ssetmn' put: (Character @env0:codePoint: 8726) @env0:asString.
	d @env0:at: 'ssmile' put: (Character @env0:codePoint: 8995) @env0:asString.
	d @env0:at: 'sstarf' put: (Character @env0:codePoint: 8902) @env0:asString.
	d @env0:at: 'Star' put: (Character @env0:codePoint: 8902) @env0:asString.
	d @env0:at: 'star' put: (Character @env0:codePoint: 9734) @env0:asString.
	d @env0:at: 'starf' put: (Character @env0:codePoint: 9733) @env0:asString.
	d @env0:at: 'straightepsilon' put: (Character @env0:codePoint: 1013) @env0:asString.
	d @env0:at: 'straightphi' put: (Character @env0:codePoint: 981) @env0:asString.
	d @env0:at: 'strns' put: (Character @env0:codePoint: 175) @env0:asString.
	d @env0:at: 'Sub' put: (Character @env0:codePoint: 8912) @env0:asString.
	d @env0:at: 'sub' put: (Character @env0:codePoint: 8834) @env0:asString.
	d @env0:at: 'subdot' put: (Character @env0:codePoint: 10941) @env0:asString.
	d @env0:at: 'subE' put: (Character @env0:codePoint: 10949) @env0:asString.
	d @env0:at: 'sube' put: (Character @env0:codePoint: 8838) @env0:asString.
	d @env0:at: 'subedot' put: (Character @env0:codePoint: 10947) @env0:asString.
	d @env0:at: 'submult' put: (Character @env0:codePoint: 10945) @env0:asString.
	d @env0:at: 'subnE' put: (Character @env0:codePoint: 10955) @env0:asString.
	d @env0:at: 'subne' put: (Character @env0:codePoint: 8842) @env0:asString.
	d @env0:at: 'subplus' put: (Character @env0:codePoint: 10943) @env0:asString.
	d @env0:at: 'subrarr' put: (Character @env0:codePoint: 10617) @env0:asString.
	d @env0:at: 'Subset' put: (Character @env0:codePoint: 8912) @env0:asString.
	d @env0:at: 'subset' put: (Character @env0:codePoint: 8834) @env0:asString.
	d @env0:at: 'subseteq' put: (Character @env0:codePoint: 8838) @env0:asString.
	d @env0:at: 'subseteqq' put: (Character @env0:codePoint: 10949) @env0:asString.
	d @env0:at: 'SubsetEqual' put: (Character @env0:codePoint: 8838) @env0:asString.
	d @env0:at: 'subsetneq' put: (Character @env0:codePoint: 8842) @env0:asString.
	d @env0:at: 'subsetneqq' put: (Character @env0:codePoint: 10955) @env0:asString.
	d @env0:at: 'subsim' put: (Character @env0:codePoint: 10951) @env0:asString.
	d @env0:at: 'subsub' put: (Character @env0:codePoint: 10965) @env0:asString.
	d @env0:at: 'subsup' put: (Character @env0:codePoint: 10963) @env0:asString.
	d @env0:at: 'succ' put: (Character @env0:codePoint: 8827) @env0:asString.
	d @env0:at: 'succapprox' put: (Character @env0:codePoint: 10936) @env0:asString.
	d @env0:at: 'succcurlyeq' put: (Character @env0:codePoint: 8829) @env0:asString.
	d @env0:at: 'Succeeds' put: (Character @env0:codePoint: 8827) @env0:asString.
	d @env0:at: 'SucceedsEqual' put: (Character @env0:codePoint: 10928) @env0:asString.
	d @env0:at: 'SucceedsSlantEqual' put: (Character @env0:codePoint: 8829) @env0:asString.
	d @env0:at: 'SucceedsTilde' put: (Character @env0:codePoint: 8831) @env0:asString.
	d @env0:at: 'succeq' put: (Character @env0:codePoint: 10928) @env0:asString.
	d @env0:at: 'succnapprox' put: (Character @env0:codePoint: 10938) @env0:asString.
	d @env0:at: 'succneqq' put: (Character @env0:codePoint: 10934) @env0:asString.
	d @env0:at: 'succnsim' put: (Character @env0:codePoint: 8937) @env0:asString.
	d @env0:at: 'succsim' put: (Character @env0:codePoint: 8831) @env0:asString.
	d @env0:at: 'SuchThat' put: (Character @env0:codePoint: 8715) @env0:asString.
	d @env0:at: 'Sum' put: (Character @env0:codePoint: 8721) @env0:asString.
	d @env0:at: 'sum' put: (Character @env0:codePoint: 8721) @env0:asString.
	d @env0:at: 'sung' put: (Character @env0:codePoint: 9834) @env0:asString.
	d @env0:at: 'sup1' put: (Character @env0:codePoint: 185) @env0:asString.
	d @env0:at: 'sup2' put: (Character @env0:codePoint: 178) @env0:asString.
	d @env0:at: 'sup3' put: (Character @env0:codePoint: 179) @env0:asString.
	d @env0:at: 'Sup' put: (Character @env0:codePoint: 8913) @env0:asString.
	d @env0:at: 'sup' put: (Character @env0:codePoint: 8835) @env0:asString.
	d @env0:at: 'supdot' put: (Character @env0:codePoint: 10942) @env0:asString.
	d @env0:at: 'supdsub' put: (Character @env0:codePoint: 10968) @env0:asString.
	d @env0:at: 'supE' put: (Character @env0:codePoint: 10950) @env0:asString.
	d @env0:at: 'supe' put: (Character @env0:codePoint: 8839) @env0:asString.
	d @env0:at: 'supedot' put: (Character @env0:codePoint: 10948) @env0:asString.
	d @env0:at: 'Superset' put: (Character @env0:codePoint: 8835) @env0:asString.
	d @env0:at: 'SupersetEqual' put: (Character @env0:codePoint: 8839) @env0:asString.
	d @env0:at: 'suphsol' put: (Character @env0:codePoint: 10185) @env0:asString.
	d @env0:at: 'suphsub' put: (Character @env0:codePoint: 10967) @env0:asString.
	d @env0:at: 'suplarr' put: (Character @env0:codePoint: 10619) @env0:asString.
	d @env0:at: 'supmult' put: (Character @env0:codePoint: 10946) @env0:asString.
	d @env0:at: 'supnE' put: (Character @env0:codePoint: 10956) @env0:asString.
	d @env0:at: 'supne' put: (Character @env0:codePoint: 8843) @env0:asString.
	d @env0:at: 'supplus' put: (Character @env0:codePoint: 10944) @env0:asString.
	d @env0:at: 'Supset' put: (Character @env0:codePoint: 8913) @env0:asString.
	d @env0:at: 'supset' put: (Character @env0:codePoint: 8835) @env0:asString.
	d @env0:at: 'supseteq' put: (Character @env0:codePoint: 8839) @env0:asString.
	d @env0:at: 'supseteqq' put: (Character @env0:codePoint: 10950) @env0:asString.
	d @env0:at: 'supsetneq' put: (Character @env0:codePoint: 8843) @env0:asString.
	d @env0:at: 'supsetneqq' put: (Character @env0:codePoint: 10956) @env0:asString.
	d @env0:at: 'supsim' put: (Character @env0:codePoint: 10952) @env0:asString.
	d @env0:at: 'supsub' put: (Character @env0:codePoint: 10964) @env0:asString.
	d @env0:at: 'supsup' put: (Character @env0:codePoint: 10966) @env0:asString.
	d @env0:at: 'swarhk' put: (Character @env0:codePoint: 10534) @env0:asString.
	d @env0:at: 'swArr' put: (Character @env0:codePoint: 8665) @env0:asString.
	d @env0:at: 'swarr' put: (Character @env0:codePoint: 8601) @env0:asString.
	d @env0:at: 'swarrow' put: (Character @env0:codePoint: 8601) @env0:asString.
	d @env0:at: 'swnwar' put: (Character @env0:codePoint: 10538) @env0:asString.
	d @env0:at: 'szlig' put: (Character @env0:codePoint: 223) @env0:asString.
	d @env0:at: 'Tab' put: (Character @env0:codePoint: 9) @env0:asString.
	d @env0:at: 'target' put: (Character @env0:codePoint: 8982) @env0:asString.
	d @env0:at: 'Tau' put: (Character @env0:codePoint: 932) @env0:asString.
	d @env0:at: 'tau' put: (Character @env0:codePoint: 964) @env0:asString.
	d @env0:at: 'tbrk' put: (Character @env0:codePoint: 9140) @env0:asString.
	d @env0:at: 'Tcaron' put: (Character @env0:codePoint: 356) @env0:asString.
	d @env0:at: 'tcaron' put: (Character @env0:codePoint: 357) @env0:asString.
	d @env0:at: 'Tcedil' put: (Character @env0:codePoint: 354) @env0:asString.
	d @env0:at: 'tcedil' put: (Character @env0:codePoint: 355) @env0:asString.
	d @env0:at: 'Tcy' put: (Character @env0:codePoint: 1058) @env0:asString.
	d @env0:at: 'tcy' put: (Character @env0:codePoint: 1090) @env0:asString.
	d @env0:at: 'tdot' put: (Character @env0:codePoint: 8411) @env0:asString.
	d @env0:at: 'telrec' put: (Character @env0:codePoint: 8981) @env0:asString.
	d @env0:at: 'Tfr' put: (Character @env0:codePoint: 120087) @env0:asString.
	d @env0:at: 'tfr' put: (Character @env0:codePoint: 120113) @env0:asString.
	d @env0:at: 'there4' put: (Character @env0:codePoint: 8756) @env0:asString.
	d @env0:at: 'Therefore' put: (Character @env0:codePoint: 8756) @env0:asString.
	d @env0:at: 'therefore' put: (Character @env0:codePoint: 8756) @env0:asString.
	d @env0:at: 'Theta' put: (Character @env0:codePoint: 920) @env0:asString.
	d @env0:at: 'theta' put: (Character @env0:codePoint: 952) @env0:asString.
	d @env0:at: 'thetasym' put: (Character @env0:codePoint: 977) @env0:asString.
	d @env0:at: 'thetav' put: (Character @env0:codePoint: 977) @env0:asString.
	d @env0:at: 'thickapprox' put: (Character @env0:codePoint: 8776) @env0:asString.
	d @env0:at: 'thicksim' put: (Character @env0:codePoint: 8764) @env0:asString.
	d @env0:at: 'ThickSpace' put: ((Character @env0:codePoint: 8287) @env0:asString @env0:, (Character @env0:codePoint: 8202) @env0:asString).
	d @env0:at: 'thinsp' put: (Character @env0:codePoint: 8201) @env0:asString.
	d @env0:at: 'ThinSpace' put: (Character @env0:codePoint: 8201) @env0:asString.
	d @env0:at: 'thkap' put: (Character @env0:codePoint: 8776) @env0:asString.
	d @env0:at: 'thksim' put: (Character @env0:codePoint: 8764) @env0:asString.
	d @env0:at: 'THORN' put: (Character @env0:codePoint: 222) @env0:asString.
	d @env0:at: 'thorn' put: (Character @env0:codePoint: 254) @env0:asString.
	d @env0:at: 'Tilde' put: (Character @env0:codePoint: 8764) @env0:asString.
	d @env0:at: 'tilde' put: (Character @env0:codePoint: 732) @env0:asString.
	d @env0:at: 'TildeEqual' put: (Character @env0:codePoint: 8771) @env0:asString.
	d @env0:at: 'TildeFullEqual' put: (Character @env0:codePoint: 8773) @env0:asString.
	d @env0:at: 'TildeTilde' put: (Character @env0:codePoint: 8776) @env0:asString.
	d @env0:at: 'times' put: (Character @env0:codePoint: 215) @env0:asString.
	d @env0:at: 'timesb' put: (Character @env0:codePoint: 8864) @env0:asString.
	d @env0:at: 'timesbar' put: (Character @env0:codePoint: 10801) @env0:asString.
	d @env0:at: 'timesd' put: (Character @env0:codePoint: 10800) @env0:asString.
	d @env0:at: 'tint' put: (Character @env0:codePoint: 8749) @env0:asString.
	d @env0:at: 'toea' put: (Character @env0:codePoint: 10536) @env0:asString.
	d @env0:at: 'top' put: (Character @env0:codePoint: 8868) @env0:asString.
	d @env0:at: 'topbot' put: (Character @env0:codePoint: 9014) @env0:asString.
	d @env0:at: 'topcir' put: (Character @env0:codePoint: 10993) @env0:asString.
	d @env0:at: 'Topf' put: (Character @env0:codePoint: 120139) @env0:asString.
	d @env0:at: 'topf' put: (Character @env0:codePoint: 120165) @env0:asString.
	d @env0:at: 'topfork' put: (Character @env0:codePoint: 10970) @env0:asString.
	d @env0:at: 'tosa' put: (Character @env0:codePoint: 10537) @env0:asString.
	d @env0:at: 'tprime' put: (Character @env0:codePoint: 8244) @env0:asString.
	d @env0:at: 'TRADE' put: (Character @env0:codePoint: 8482) @env0:asString.
	d @env0:at: 'trade' put: (Character @env0:codePoint: 8482) @env0:asString.
	d @env0:at: 'triangle' put: (Character @env0:codePoint: 9653) @env0:asString.
	d @env0:at: 'triangledown' put: (Character @env0:codePoint: 9663) @env0:asString.
	d @env0:at: 'triangleleft' put: (Character @env0:codePoint: 9667) @env0:asString.
	d @env0:at: 'trianglelefteq' put: (Character @env0:codePoint: 8884) @env0:asString.
	d @env0:at: 'triangleq' put: (Character @env0:codePoint: 8796) @env0:asString.
	d @env0:at: 'triangleright' put: (Character @env0:codePoint: 9657) @env0:asString.
	d @env0:at: 'trianglerighteq' put: (Character @env0:codePoint: 8885) @env0:asString.
	d @env0:at: 'tridot' put: (Character @env0:codePoint: 9708) @env0:asString.
	d @env0:at: 'trie' put: (Character @env0:codePoint: 8796) @env0:asString.
	d @env0:at: 'triminus' put: (Character @env0:codePoint: 10810) @env0:asString.
	d @env0:at: 'TripleDot' put: (Character @env0:codePoint: 8411) @env0:asString.
	d @env0:at: 'triplus' put: (Character @env0:codePoint: 10809) @env0:asString.
	d @env0:at: 'trisb' put: (Character @env0:codePoint: 10701) @env0:asString.
	d @env0:at: 'tritime' put: (Character @env0:codePoint: 10811) @env0:asString.
	d @env0:at: 'trpezium' put: (Character @env0:codePoint: 9186) @env0:asString.
	d @env0:at: 'Tscr' put: (Character @env0:codePoint: 119983) @env0:asString.
	d @env0:at: 'tscr' put: (Character @env0:codePoint: 120009) @env0:asString.
	d @env0:at: 'TScy' put: (Character @env0:codePoint: 1062) @env0:asString.
	d @env0:at: 'tscy' put: (Character @env0:codePoint: 1094) @env0:asString.
	d @env0:at: 'TSHcy' put: (Character @env0:codePoint: 1035) @env0:asString.
	d @env0:at: 'tshcy' put: (Character @env0:codePoint: 1115) @env0:asString.
	d @env0:at: 'Tstrok' put: (Character @env0:codePoint: 358) @env0:asString.
	d @env0:at: 'tstrok' put: (Character @env0:codePoint: 359) @env0:asString.
	d @env0:at: 'twixt' put: (Character @env0:codePoint: 8812) @env0:asString.
	d @env0:at: 'twoheadleftarrow' put: (Character @env0:codePoint: 8606) @env0:asString.
	d @env0:at: 'twoheadrightarrow' put: (Character @env0:codePoint: 8608) @env0:asString.
	d @env0:at: 'Uacute' put: (Character @env0:codePoint: 218) @env0:asString.
	d @env0:at: 'uacute' put: (Character @env0:codePoint: 250) @env0:asString.
	d @env0:at: 'Uarr' put: (Character @env0:codePoint: 8607) @env0:asString.
	d @env0:at: 'uArr' put: (Character @env0:codePoint: 8657) @env0:asString.
	d @env0:at: 'uarr' put: (Character @env0:codePoint: 8593) @env0:asString.
	d @env0:at: 'Uarrocir' put: (Character @env0:codePoint: 10569) @env0:asString.
	d @env0:at: 'Ubrcy' put: (Character @env0:codePoint: 1038) @env0:asString.
	d @env0:at: 'ubrcy' put: (Character @env0:codePoint: 1118) @env0:asString.
	d @env0:at: 'Ubreve' put: (Character @env0:codePoint: 364) @env0:asString.
	d @env0:at: 'ubreve' put: (Character @env0:codePoint: 365) @env0:asString.
	d @env0:at: 'Ucirc' put: (Character @env0:codePoint: 219) @env0:asString.
	d @env0:at: 'ucirc' put: (Character @env0:codePoint: 251) @env0:asString.
	d @env0:at: 'Ucy' put: (Character @env0:codePoint: 1059) @env0:asString.
	d @env0:at: 'ucy' put: (Character @env0:codePoint: 1091) @env0:asString.
	d @env0:at: 'udarr' put: (Character @env0:codePoint: 8645) @env0:asString.
	d @env0:at: 'Udblac' put: (Character @env0:codePoint: 368) @env0:asString.
	d @env0:at: 'udblac' put: (Character @env0:codePoint: 369) @env0:asString.
	d @env0:at: 'udhar' put: (Character @env0:codePoint: 10606) @env0:asString.
	d @env0:at: 'ufisht' put: (Character @env0:codePoint: 10622) @env0:asString.
	d @env0:at: 'Ufr' put: (Character @env0:codePoint: 120088) @env0:asString.
	d @env0:at: 'ufr' put: (Character @env0:codePoint: 120114) @env0:asString.
	d @env0:at: 'Ugrave' put: (Character @env0:codePoint: 217) @env0:asString.
	d @env0:at: 'ugrave' put: (Character @env0:codePoint: 249) @env0:asString.
	d @env0:at: 'uHar' put: (Character @env0:codePoint: 10595) @env0:asString.
	d @env0:at: 'uharl' put: (Character @env0:codePoint: 8639) @env0:asString.
	d @env0:at: 'uharr' put: (Character @env0:codePoint: 8638) @env0:asString.
	d @env0:at: 'uhblk' put: (Character @env0:codePoint: 9600) @env0:asString.
	d @env0:at: 'ulcorn' put: (Character @env0:codePoint: 8988) @env0:asString.
	d @env0:at: 'ulcorner' put: (Character @env0:codePoint: 8988) @env0:asString.
	d @env0:at: 'ulcrop' put: (Character @env0:codePoint: 8975) @env0:asString.
	d @env0:at: 'ultri' put: (Character @env0:codePoint: 9720) @env0:asString.
	d @env0:at: 'Umacr' put: (Character @env0:codePoint: 362) @env0:asString.
	d @env0:at: 'umacr' put: (Character @env0:codePoint: 363) @env0:asString.
	d @env0:at: 'uml' put: (Character @env0:codePoint: 168) @env0:asString.
	d @env0:at: 'UnderBar' put: (Character @env0:codePoint: 95) @env0:asString.
	d @env0:at: 'UnderBrace' put: (Character @env0:codePoint: 9183) @env0:asString.
	d @env0:at: 'UnderBracket' put: (Character @env0:codePoint: 9141) @env0:asString.
	d @env0:at: 'UnderParenthesis' put: (Character @env0:codePoint: 9181) @env0:asString.
	d @env0:at: 'Union' put: (Character @env0:codePoint: 8899) @env0:asString.
	d @env0:at: 'UnionPlus' put: (Character @env0:codePoint: 8846) @env0:asString.
	d @env0:at: 'Uogon' put: (Character @env0:codePoint: 370) @env0:asString.
	d @env0:at: 'uogon' put: (Character @env0:codePoint: 371) @env0:asString.
	d @env0:at: 'Uopf' put: (Character @env0:codePoint: 120140) @env0:asString.
	d @env0:at: 'uopf' put: (Character @env0:codePoint: 120166) @env0:asString.
	d @env0:at: 'UpArrow' put: (Character @env0:codePoint: 8593) @env0:asString.
	d @env0:at: 'Uparrow' put: (Character @env0:codePoint: 8657) @env0:asString.
	d @env0:at: 'uparrow' put: (Character @env0:codePoint: 8593) @env0:asString.
	d @env0:at: 'UpArrowBar' put: (Character @env0:codePoint: 10514) @env0:asString.
	d @env0:at: 'UpArrowDownArrow' put: (Character @env0:codePoint: 8645) @env0:asString.
	d @env0:at: 'UpDownArrow' put: (Character @env0:codePoint: 8597) @env0:asString.
	d @env0:at: 'Updownarrow' put: (Character @env0:codePoint: 8661) @env0:asString.
	d @env0:at: 'updownarrow' put: (Character @env0:codePoint: 8597) @env0:asString.
	d @env0:at: 'UpEquilibrium' put: (Character @env0:codePoint: 10606) @env0:asString.
	d @env0:at: 'upharpoonleft' put: (Character @env0:codePoint: 8639) @env0:asString.
	d @env0:at: 'upharpoonright' put: (Character @env0:codePoint: 8638) @env0:asString.
	d @env0:at: 'uplus' put: (Character @env0:codePoint: 8846) @env0:asString.
	d @env0:at: 'UpperLeftArrow' put: (Character @env0:codePoint: 8598) @env0:asString.
	d @env0:at: 'UpperRightArrow' put: (Character @env0:codePoint: 8599) @env0:asString.
	d @env0:at: 'Upsi' put: (Character @env0:codePoint: 978) @env0:asString.
	d @env0:at: 'upsi' put: (Character @env0:codePoint: 965) @env0:asString.
	d @env0:at: 'upsih' put: (Character @env0:codePoint: 978) @env0:asString.
	d @env0:at: 'Upsilon' put: (Character @env0:codePoint: 933) @env0:asString.
	d @env0:at: 'upsilon' put: (Character @env0:codePoint: 965) @env0:asString.
	d @env0:at: 'UpTee' put: (Character @env0:codePoint: 8869) @env0:asString.
	d @env0:at: 'UpTeeArrow' put: (Character @env0:codePoint: 8613) @env0:asString.
	d @env0:at: 'upuparrows' put: (Character @env0:codePoint: 8648) @env0:asString.
	d @env0:at: 'urcorn' put: (Character @env0:codePoint: 8989) @env0:asString.
	d @env0:at: 'urcorner' put: (Character @env0:codePoint: 8989) @env0:asString.
	d @env0:at: 'urcrop' put: (Character @env0:codePoint: 8974) @env0:asString.
	d @env0:at: 'Uring' put: (Character @env0:codePoint: 366) @env0:asString.
	d @env0:at: 'uring' put: (Character @env0:codePoint: 367) @env0:asString.
	d @env0:at: 'urtri' put: (Character @env0:codePoint: 9721) @env0:asString.
	d @env0:at: 'Uscr' put: (Character @env0:codePoint: 119984) @env0:asString.
	d @env0:at: 'uscr' put: (Character @env0:codePoint: 120010) @env0:asString.
	d @env0:at: 'utdot' put: (Character @env0:codePoint: 8944) @env0:asString.
	d @env0:at: 'Utilde' put: (Character @env0:codePoint: 360) @env0:asString.
	d @env0:at: 'utilde' put: (Character @env0:codePoint: 361) @env0:asString.
	d @env0:at: 'utri' put: (Character @env0:codePoint: 9653) @env0:asString.
	d @env0:at: 'utrif' put: (Character @env0:codePoint: 9652) @env0:asString.
	d @env0:at: 'uuarr' put: (Character @env0:codePoint: 8648) @env0:asString.
	d @env0:at: 'Uuml' put: (Character @env0:codePoint: 220) @env0:asString.
	d @env0:at: 'uuml' put: (Character @env0:codePoint: 252) @env0:asString.
	d @env0:at: 'uwangle' put: (Character @env0:codePoint: 10663) @env0:asString.
	d @env0:at: 'vangrt' put: (Character @env0:codePoint: 10652) @env0:asString.
	d @env0:at: 'varepsilon' put: (Character @env0:codePoint: 1013) @env0:asString.
	d @env0:at: 'varkappa' put: (Character @env0:codePoint: 1008) @env0:asString.
	d @env0:at: 'varnothing' put: (Character @env0:codePoint: 8709) @env0:asString.
	d @env0:at: 'varphi' put: (Character @env0:codePoint: 981) @env0:asString.
	d @env0:at: 'varpi' put: (Character @env0:codePoint: 982) @env0:asString.
	d @env0:at: 'varpropto' put: (Character @env0:codePoint: 8733) @env0:asString.
	d @env0:at: 'vArr' put: (Character @env0:codePoint: 8661) @env0:asString.
	d @env0:at: 'varr' put: (Character @env0:codePoint: 8597) @env0:asString.
	d @env0:at: 'varrho' put: (Character @env0:codePoint: 1009) @env0:asString.
	d @env0:at: 'varsigma' put: (Character @env0:codePoint: 962) @env0:asString.
	d @env0:at: 'varsubsetneq' put: ((Character @env0:codePoint: 8842) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'varsubsetneqq' put: ((Character @env0:codePoint: 10955) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'varsupsetneq' put: ((Character @env0:codePoint: 8843) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'varsupsetneqq' put: ((Character @env0:codePoint: 10956) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'vartheta' put: (Character @env0:codePoint: 977) @env0:asString.
	d @env0:at: 'vartriangleleft' put: (Character @env0:codePoint: 8882) @env0:asString.
	d @env0:at: 'vartriangleright' put: (Character @env0:codePoint: 8883) @env0:asString.
	d @env0:at: 'Vbar' put: (Character @env0:codePoint: 10987) @env0:asString.
	d @env0:at: 'vBar' put: (Character @env0:codePoint: 10984) @env0:asString.
	d @env0:at: 'vBarv' put: (Character @env0:codePoint: 10985) @env0:asString.
	d @env0:at: 'Vcy' put: (Character @env0:codePoint: 1042) @env0:asString.
	d @env0:at: 'vcy' put: (Character @env0:codePoint: 1074) @env0:asString.
	d @env0:at: 'VDash' put: (Character @env0:codePoint: 8875) @env0:asString.
	d @env0:at: 'Vdash' put: (Character @env0:codePoint: 8873) @env0:asString.
	d @env0:at: 'vDash' put: (Character @env0:codePoint: 8872) @env0:asString.
	d @env0:at: 'vdash' put: (Character @env0:codePoint: 8866) @env0:asString.
	d @env0:at: 'Vdashl' put: (Character @env0:codePoint: 10982) @env0:asString.
	d @env0:at: 'Vee' put: (Character @env0:codePoint: 8897) @env0:asString.
	d @env0:at: 'vee' put: (Character @env0:codePoint: 8744) @env0:asString.
	d @env0:at: 'veebar' put: (Character @env0:codePoint: 8891) @env0:asString.
	d @env0:at: 'veeeq' put: (Character @env0:codePoint: 8794) @env0:asString.
	d @env0:at: 'vellip' put: (Character @env0:codePoint: 8942) @env0:asString.
	d @env0:at: 'Verbar' put: (Character @env0:codePoint: 8214) @env0:asString.
	d @env0:at: 'verbar' put: (Character @env0:codePoint: 124) @env0:asString.
	d @env0:at: 'Vert' put: (Character @env0:codePoint: 8214) @env0:asString.
	d @env0:at: 'vert' put: (Character @env0:codePoint: 124) @env0:asString.
	d @env0:at: 'VerticalBar' put: (Character @env0:codePoint: 8739) @env0:asString.
	d @env0:at: 'VerticalLine' put: (Character @env0:codePoint: 124) @env0:asString.
	d @env0:at: 'VerticalSeparator' put: (Character @env0:codePoint: 10072) @env0:asString.
	d @env0:at: 'VerticalTilde' put: (Character @env0:codePoint: 8768) @env0:asString.
	d @env0:at: 'VeryThinSpace' put: (Character @env0:codePoint: 8202) @env0:asString.
	d @env0:at: 'Vfr' put: (Character @env0:codePoint: 120089) @env0:asString.
	d @env0:at: 'vfr' put: (Character @env0:codePoint: 120115) @env0:asString.
	d @env0:at: 'vltri' put: (Character @env0:codePoint: 8882) @env0:asString.
	d @env0:at: 'vnsub' put: ((Character @env0:codePoint: 8834) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'vnsup' put: ((Character @env0:codePoint: 8835) @env0:asString @env0:, (Character @env0:codePoint: 8402) @env0:asString).
	d @env0:at: 'Vopf' put: (Character @env0:codePoint: 120141) @env0:asString.
	d @env0:at: 'vopf' put: (Character @env0:codePoint: 120167) @env0:asString.
	d @env0:at: 'vprop' put: (Character @env0:codePoint: 8733) @env0:asString.
	d @env0:at: 'vrtri' put: (Character @env0:codePoint: 8883) @env0:asString.
	d @env0:at: 'Vscr' put: (Character @env0:codePoint: 119985) @env0:asString.
	d @env0:at: 'vscr' put: (Character @env0:codePoint: 120011) @env0:asString.
	d @env0:at: 'vsubnE' put: ((Character @env0:codePoint: 10955) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'vsubne' put: ((Character @env0:codePoint: 8842) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'vsupnE' put: ((Character @env0:codePoint: 10956) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'vsupne' put: ((Character @env0:codePoint: 8843) @env0:asString @env0:, (Character @env0:codePoint: 65024) @env0:asString).
	d @env0:at: 'Vvdash' put: (Character @env0:codePoint: 8874) @env0:asString.
	d @env0:at: 'vzigzag' put: (Character @env0:codePoint: 10650) @env0:asString.
	d @env0:at: 'Wcirc' put: (Character @env0:codePoint: 372) @env0:asString.
	d @env0:at: 'wcirc' put: (Character @env0:codePoint: 373) @env0:asString.
	d @env0:at: 'wedbar' put: (Character @env0:codePoint: 10847) @env0:asString.
	d @env0:at: 'Wedge' put: (Character @env0:codePoint: 8896) @env0:asString.
	d @env0:at: 'wedge' put: (Character @env0:codePoint: 8743) @env0:asString.
	d @env0:at: 'wedgeq' put: (Character @env0:codePoint: 8793) @env0:asString.
	d @env0:at: 'weierp' put: (Character @env0:codePoint: 8472) @env0:asString.
	d @env0:at: 'Wfr' put: (Character @env0:codePoint: 120090) @env0:asString.
	d @env0:at: 'wfr' put: (Character @env0:codePoint: 120116) @env0:asString.
	d @env0:at: 'Wopf' put: (Character @env0:codePoint: 120142) @env0:asString.
	d @env0:at: 'wopf' put: (Character @env0:codePoint: 120168) @env0:asString.
	d @env0:at: 'wp' put: (Character @env0:codePoint: 8472) @env0:asString.
	d @env0:at: 'wr' put: (Character @env0:codePoint: 8768) @env0:asString.
	d @env0:at: 'wreath' put: (Character @env0:codePoint: 8768) @env0:asString.
	d @env0:at: 'Wscr' put: (Character @env0:codePoint: 119986) @env0:asString.
	d @env0:at: 'wscr' put: (Character @env0:codePoint: 120012) @env0:asString.
	d @env0:at: 'xcap' put: (Character @env0:codePoint: 8898) @env0:asString.
	d @env0:at: 'xcirc' put: (Character @env0:codePoint: 9711) @env0:asString.
	d @env0:at: 'xcup' put: (Character @env0:codePoint: 8899) @env0:asString.
	d @env0:at: 'xdtri' put: (Character @env0:codePoint: 9661) @env0:asString.
	d @env0:at: 'Xfr' put: (Character @env0:codePoint: 120091) @env0:asString.
	d @env0:at: 'xfr' put: (Character @env0:codePoint: 120117) @env0:asString.
	d @env0:at: 'xhArr' put: (Character @env0:codePoint: 10234) @env0:asString.
	d @env0:at: 'xharr' put: (Character @env0:codePoint: 10231) @env0:asString.
	d @env0:at: 'Xi' put: (Character @env0:codePoint: 926) @env0:asString.
	d @env0:at: 'xi' put: (Character @env0:codePoint: 958) @env0:asString.
	d @env0:at: 'xlArr' put: (Character @env0:codePoint: 10232) @env0:asString.
	d @env0:at: 'xlarr' put: (Character @env0:codePoint: 10229) @env0:asString.
	d @env0:at: 'xmap' put: (Character @env0:codePoint: 10236) @env0:asString.
	d @env0:at: 'xnis' put: (Character @env0:codePoint: 8955) @env0:asString.
	d @env0:at: 'xodot' put: (Character @env0:codePoint: 10752) @env0:asString.
	d @env0:at: 'Xopf' put: (Character @env0:codePoint: 120143) @env0:asString.
	d @env0:at: 'xopf' put: (Character @env0:codePoint: 120169) @env0:asString.
	d @env0:at: 'xoplus' put: (Character @env0:codePoint: 10753) @env0:asString.
	d @env0:at: 'xotime' put: (Character @env0:codePoint: 10754) @env0:asString.
	d @env0:at: 'xrArr' put: (Character @env0:codePoint: 10233) @env0:asString.
	d @env0:at: 'xrarr' put: (Character @env0:codePoint: 10230) @env0:asString.
	d @env0:at: 'Xscr' put: (Character @env0:codePoint: 119987) @env0:asString.
	d @env0:at: 'xscr' put: (Character @env0:codePoint: 120013) @env0:asString.
	d @env0:at: 'xsqcup' put: (Character @env0:codePoint: 10758) @env0:asString.
	d @env0:at: 'xuplus' put: (Character @env0:codePoint: 10756) @env0:asString.
	d @env0:at: 'xutri' put: (Character @env0:codePoint: 9651) @env0:asString.
	d @env0:at: 'xvee' put: (Character @env0:codePoint: 8897) @env0:asString.
	d @env0:at: 'xwedge' put: (Character @env0:codePoint: 8896) @env0:asString.
	d @env0:at: 'Yacute' put: (Character @env0:codePoint: 221) @env0:asString.
	d @env0:at: 'yacute' put: (Character @env0:codePoint: 253) @env0:asString.
	d @env0:at: 'YAcy' put: (Character @env0:codePoint: 1071) @env0:asString.
	d @env0:at: 'yacy' put: (Character @env0:codePoint: 1103) @env0:asString.
	d @env0:at: 'Ycirc' put: (Character @env0:codePoint: 374) @env0:asString.
	d @env0:at: 'ycirc' put: (Character @env0:codePoint: 375) @env0:asString.
	d @env0:at: 'Ycy' put: (Character @env0:codePoint: 1067) @env0:asString.
	d @env0:at: 'ycy' put: (Character @env0:codePoint: 1099) @env0:asString.
	d @env0:at: 'yen' put: (Character @env0:codePoint: 165) @env0:asString.
	d @env0:at: 'Yfr' put: (Character @env0:codePoint: 120092) @env0:asString.
	d @env0:at: 'yfr' put: (Character @env0:codePoint: 120118) @env0:asString.
	d @env0:at: 'YIcy' put: (Character @env0:codePoint: 1031) @env0:asString.
	d @env0:at: 'yicy' put: (Character @env0:codePoint: 1111) @env0:asString.
	d @env0:at: 'Yopf' put: (Character @env0:codePoint: 120144) @env0:asString.
	d @env0:at: 'yopf' put: (Character @env0:codePoint: 120170) @env0:asString.
	d @env0:at: 'Yscr' put: (Character @env0:codePoint: 119988) @env0:asString.
	d @env0:at: 'yscr' put: (Character @env0:codePoint: 120014) @env0:asString.
	d @env0:at: 'YUcy' put: (Character @env0:codePoint: 1070) @env0:asString.
	d @env0:at: 'yucy' put: (Character @env0:codePoint: 1102) @env0:asString.
	d @env0:at: 'Yuml' put: (Character @env0:codePoint: 376) @env0:asString.
	d @env0:at: 'yuml' put: (Character @env0:codePoint: 255) @env0:asString.
	d @env0:at: 'Zacute' put: (Character @env0:codePoint: 377) @env0:asString.
	d @env0:at: 'zacute' put: (Character @env0:codePoint: 378) @env0:asString.
	d @env0:at: 'Zcaron' put: (Character @env0:codePoint: 381) @env0:asString.
	d @env0:at: 'zcaron' put: (Character @env0:codePoint: 382) @env0:asString.
	d @env0:at: 'Zcy' put: (Character @env0:codePoint: 1047) @env0:asString.
	d @env0:at: 'zcy' put: (Character @env0:codePoint: 1079) @env0:asString.
	d @env0:at: 'Zdot' put: (Character @env0:codePoint: 379) @env0:asString.
	d @env0:at: 'zdot' put: (Character @env0:codePoint: 380) @env0:asString.
	d @env0:at: 'zeetrf' put: (Character @env0:codePoint: 8488) @env0:asString.
	d @env0:at: 'ZeroWidthSpace' put: (Character @env0:codePoint: 8203) @env0:asString.
	d @env0:at: 'Zeta' put: (Character @env0:codePoint: 918) @env0:asString.
	d @env0:at: 'zeta' put: (Character @env0:codePoint: 950) @env0:asString.
	d @env0:at: 'Zfr' put: (Character @env0:codePoint: 8488) @env0:asString.
	d @env0:at: 'zfr' put: (Character @env0:codePoint: 120119) @env0:asString.
	d @env0:at: 'ZHcy' put: (Character @env0:codePoint: 1046) @env0:asString.
	d @env0:at: 'zhcy' put: (Character @env0:codePoint: 1078) @env0:asString.
	d @env0:at: 'zigrarr' put: (Character @env0:codePoint: 8669) @env0:asString.
	d @env0:at: 'Zopf' put: (Character @env0:codePoint: 8484) @env0:asString.
	d @env0:at: 'zopf' put: (Character @env0:codePoint: 120171) @env0:asString.
	d @env0:at: 'Zscr' put: (Character @env0:codePoint: 119989) @env0:asString.
	d @env0:at: 'zscr' put: (Character @env0:codePoint: 120015) @env0:asString.
	d @env0:at: 'zwj' put: (Character @env0:codePoint: 8205) @env0:asString.
	d @env0:at: 'zwnj' put: (Character @env0:codePoint: 8204) @env0:asString.

	self @env0:at: #html5 put: d
%


set compile_env: 0
