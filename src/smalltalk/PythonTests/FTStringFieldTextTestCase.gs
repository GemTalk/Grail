! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'FTStringFieldTextTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
FTStringFieldTextTestCase comment:
'The text of an f-string or t-string replacement field: a t-string
Interpolation''s expression, the debug form''s text, and how a comment or a
quote inside a field is scanned.

CPython 3.14.8 keeps a t-string expression''s trailing whitespace (gh-154719).
A comment inside a field failed to compile -- re-parsed as ``(x  # c)'''' its
closing paren was commented out -- and a quote or brace inside the comment
derailed the tokenizer.  A quote in a format spec opened a string.

Every expectation in tests/python/ftstring_field_text.py was produced by
CPython 3.14.8; the fixture gate re-checks it there.'
%

doit
FTStringFieldTextTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
FTStringFieldTextTestCase removeAllMethods: 0.
FTStringFieldTextTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: FTStringFieldTextTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ftstring_field_text' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ftstring_field_text.py')
		name: 'ftstring_field_text'.
%

category: 'Grail-Helpers'
method: FTStringFieldTextTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: FTStringFieldTextTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: FTStringFieldTextTestCase
testTStringExpressionText
	"t'{ x }' records ' x ' (CPython 3.14.8), and the debug form drops only
	the = and what follows it."

	self assertAll: #('tstring_trailing_whitespace_is_kept' 'tstring_debug_form'
		'debug_equals_then_line_continuation')
%

category: 'Grail-Tests'
method: FTStringFieldTextTestCase
testCommentsInAField
	"A comment in a field compiles, is left out of the text, and a quote or
	brace inside it is not structure."

	self assertAll: #('comment_in_a_field' 'comment_holding_quotes_and_braces'
		'comment_in_the_debug_form')
%

category: 'Grail-Tests'
method: FTStringFieldTextTestCase
testHashAndQuotesInASpec
	"# is the alternate-form flag in a spec, and a quote there is a fill
	character, not a string."

	self assertAll: #('hash_in_a_string_or_a_spec' 'quote_in_a_format_spec')
%
