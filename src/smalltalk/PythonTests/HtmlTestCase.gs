! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for HtmlTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'HtmlTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
HtmlTestCase category: 'SUnit'
%

set compile_env: 0

! ===============================================================================
! Tests - html.escape
! ===============================================================================

category: 'Tests - escape'
method: HtmlTestCase
testEscapeBasic
	"Test escaping basic HTML special characters."

	self assert: (self eval:
'import html
result = html.escape(''<div>'')
result
') equals: '&lt;div&gt;'.
%

category: 'Tests - escape'
method: HtmlTestCase
testEscapeAmpersand
	"Test that & is escaped and does not double-escape."

	self assert: (self eval:
'import html
result = html.escape(''AT&T'')
result
') equals: 'AT&amp;T'.
%

category: 'Tests - escape'
method: HtmlTestCase
testEscapeQuotes
	"Test that quotes are escaped by default."

	self assert: (self eval:
'import html
result = html.escape(''<div class="x">'')
result
') equals: '&lt;div class=&quot;x&quot;&gt;'.
%

category: 'Tests - escape'
method: HtmlTestCase
testEscapeSingleQuotes
	"Test that single quotes are escaped by default."

	self assert: (self eval:
'import html
result = html.escape("it''s")
result
') equals: 'it&#x27;s'.
%

category: 'Tests - escape'
method: HtmlTestCase
testEscapeNoQuotes
	"Test that quotes are not escaped when quote=False."

	self assert: (self eval:
'import html
result = html.escape(''<b>"bold"</b>'', False)
result
') equals: '&lt;b&gt;"bold"&lt;/b&gt;'.
%

category: 'Tests - escape'
method: HtmlTestCase
testEscapeNoSpecialChars
	"Test that plain text is returned unchanged."

	self assert: (self eval:
'import html
result = html.escape(''hello world'')
result
') equals: 'hello world'.
%

! ===============================================================================
! Tests - html.unescape
! ===============================================================================

category: 'Tests - unescape'
method: HtmlTestCase
testUnescapeBasic
	"Test unescaping basic HTML entities."

	self assert: (self eval:
'import html
result = html.unescape(''&lt;&amp;&gt;'')
result
') equals: '<&>'.
%

category: 'Tests - unescape'
method: HtmlTestCase
testUnescapeDecimal
	"Test unescaping decimal numeric references."

	self assert: (self eval:
'import html
result = html.unescape(''&#60;'')
result
') equals: '<'.
%

category: 'Tests - unescape'
method: HtmlTestCase
testUnescapeHex
	"Test unescaping hex numeric references."

	self assert: (self eval:
'import html
result = html.unescape(''&#x3c;'')
result
') equals: '<'.
%

category: 'Tests - unescape'
method: HtmlTestCase
testUnescapeQuot
	"Test unescaping &quot; entity."

	self assert: (self eval:
'import html
result = html.unescape(''&quot;hello&quot;'')
result
') equals: '"hello"'.
%

category: 'Tests - unescape'
method: HtmlTestCase
testUnescapeNoEntities
	"Test that plain text is returned unchanged."

	self assert: (self eval:
'import html
result = html.unescape(''hello world'')
result
') equals: 'hello world'.
%

category: 'Tests - unescape'
method: HtmlTestCase
testUnescapeUnknownEntity
	"Test that unknown entities are left as-is."

	self assert: (self eval:
'import html
result = html.unescape(''&unknown;'')
result
') equals: '&unknown;'.
%

category: 'Tests - roundtrip'
method: HtmlTestCase
testRoundtrip
	"Test that unescape(escape(s)) returns the original string."

	self assert: (self eval:
'import html
original = ''<script>alert("xss")</script>''
result = html.unescape(html.escape(original))
result
') equals: '<script>alert("xss")</script>'.
%

! ===============================================================================
! Tests - html.entities
! ===============================================================================

category: 'Tests - entities'
method: HtmlTestCase
testEntitiesName2Codepoint
	"Test that name2codepoint maps entity names to codepoints."

	self assert: (self eval:
'import html
result = html.entities.name2codepoint[''amp'']
result
') equals: 38.
%

category: 'Tests - entities'
method: HtmlTestCase
testEntitiesName2CodepointGreek
	"Test that Greek entities are in name2codepoint."

	self assert: (self eval:
'import html
result = html.entities.name2codepoint[''theta'']
result
') equals: 952.
%

category: 'Tests - entities'
method: HtmlTestCase
testEntitiesCodepoint2Name
	"Test that codepoint2name maps codepoints to entity names."

	self assert: (self eval:
'import html
result = html.entities.codepoint2name[60]
result
') equals: 'lt'.
%

category: 'Tests - entities'
method: HtmlTestCase
testEntitiesEntitydefs
	"Test that entitydefs maps entity names to character strings."

	self assert: (self eval:
'import html
result = html.entities.entitydefs[''amp'']
result
') equals: '&'.
%

category: 'Tests - entities'
method: HtmlTestCase
testUnescapeGreekEntity
	"Test that unescape handles Greek entities from the full table."

	self assert: (self eval:
'import html
result = html.unescape(''&alpha;&beta;&gamma;'')
result
') equals: (
	(Character perform: #codePoint: env: 0 withArguments: { 945 }) asString,
	(Character perform: #codePoint: env: 0 withArguments: { 946 }) asString,
	(Character perform: #codePoint: env: 0 withArguments: { 947 }) asString
).
%

category: 'Tests - entities'
method: HtmlTestCase
testUnicode16StrMethod
	"Test that __str__ works on Unicode16 strings (not just Unicode7)."

	| greek result |
	greek := (Character codePoint: 945) asString,
		(Character codePoint: 946) asString,
		(Character codePoint: 947) asString.
	"greek is a DoubleByteString (MultiByteString subclass)"
	self assert: (greek class name) equals: #'DoubleByteString'.
	"__str__ should return self"
	result := greek perform: #__str__ env: 1.
	self assert: result equals: greek.
%

category: 'Tests - entities'
method: HtmlTestCase
testUnicode16ReprMethod
	"Test that __repr__ works on Unicode16 strings."

	| greek result |
	greek := (Character codePoint: 945) asString,
		(Character codePoint: 946) asString,
		(Character codePoint: 947) asString.
	result := greek perform: #__repr__ env: 1.
	self assert: (result includesString: '''').
%

category: 'Tests - entities'
method: HtmlTestCase
testUnicode16LenMethod
	"Test that __len__ works on Unicode16 strings."

	| greek result |
	greek := (Character codePoint: 945) asString,
		(Character codePoint: 946) asString,
		(Character codePoint: 947) asString.
	result := greek perform: #__len__ env: 1.
	self assert: result equals: 3.
%

! ===============================================================================
! Tests - html5 entity dict
! ===============================================================================

category: 'Tests - html5'
method: HtmlTestCase
testHtml5SingleCodepoint
	"Test html5 dict for a single-codepoint entity."

	self assert: (self eval:
'import html
result = html.entities.html5[''lt'']
result
') equals: '<'.
%

category: 'Tests - html5'
method: HtmlTestCase
testHtml5Amp
	"Test html5 dict for amp entity."

	self assert: (self eval:
'import html
result = html.entities.html5[''amp'']
result
') equals: '&'.
%

category: 'Tests - html5'
method: HtmlTestCase
testHtml5MultiCodepoint
	"Test html5 dict for a multi-codepoint entity (acE = U+223E U+0333)."

	| result |
	result := self eval:
'import html
result = html.entities.html5[''acE'']
len(result)
'.
	self assert: result equals: 2.
%

category: 'Tests - html5'
method: HtmlTestCase
testHtml5Size
	"Test html5 dict has the expected number of entries."

	| result |
	result := self eval:
'import html
result = len(html.entities.html5)
result
'.
	self assert: (result >= 2100).
%
