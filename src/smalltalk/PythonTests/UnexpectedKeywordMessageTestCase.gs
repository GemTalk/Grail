! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'UnexpectedKeywordMessageTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
UnexpectedKeywordMessageTestCase comment:
'The TypeError text for a keyword the callee cannot bind.

Both emissions in FunctionDefAst''s call-validation guard (three counting
the positional-only variant) read ``got an unexpected keyword argument: z''
with the BARE function name, where CPython prefixes the __qualname__ and
quotes the argument -- test_locks'' test_lock_doesnt_accept_loop_parameter
regex-matches ``Lock\.__init__\(\) got an unexpected keyword argument
''loop''''.  The messages now come from the same ___qualifiedNameFor___:
the arity errors already used, so a method reports ``Cls.__init__()'', a
nested class chains, and a def inside a function carries ``<locals>''.
This closes the KNOWN GAP that MissingArgumentMessageTestCase''s header
used to document.

See tests/python/unexpected_keyword_message.py (8 checks,
CPython-validated first).'
%

expectvalue /Class
doit
UnexpectedKeywordMessageTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
UnexpectedKeywordMessageTestCase removeAllMethods: 0.
UnexpectedKeywordMessageTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: UnexpectedKeywordMessageTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'unexpected_keyword_message' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unexpected_keyword_message.py')
		name: 'unexpected_keyword_message'.
%

category: 'Grail-Helpers'
method: UnexpectedKeywordMessageTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: UnexpectedKeywordMessageTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: UnexpectedKeywordMessageTestCase
testTheQualnamePrefix
	"Method, nested class, and <locals> chains -- the same helper the arity
	messages use, so the two agree by construction."

	self assertAll: #('method_qualname' 'plain_function'
		'nested_class_qualname' 'locals_qualname')
%

category: 'Grail-Tests'
method: UnexpectedKeywordMessageTestCase
testThePosonlyVariant
	"CPython prefers the posonly report when a call commits both sins, and
	**kwargs still collects instead of raising."

	self assertAll: #('posonly_by_keyword' 'posonly_outranks_unknown'
		'unknown_on_posonly_def' 'kwargs_still_collects')
%
