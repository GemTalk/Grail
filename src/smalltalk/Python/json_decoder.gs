set compile_env: 0

! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- json_decoder class (Python 'json.decoder' module)
expectvalue /Class
doit
module subclass: 'json_decoder'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
json_decoder comment:
'Python json.decoder module.

CPython defines JSONDecodeError here, and json/__init__.py re-exports it, so
``json.decoder.JSONDecodeError is json.JSONDecodeError'' -- and the class''s
own __module__ is ''json.decoder'', not ''json''.  Both spellings appear in
real code, so both must resolve to the SAME class or ``except'' clauses
silently stop matching.

See https://docs.python.org/3/library/json.html
'
%

expectvalue /Class
doit
json_decoder category: 'Grail-Modules'
%

! ------------------- Remove existing Python methods from json_decoder
expectvalue /Metaclass3
doit
json_decoder removeAllMethods: 0.
json_decoder removeAllMethods: 1.
json_decoder class removeAllMethods: 0.
json_decoder class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: json_decoder
initialize
	"The SAME class object the json module exposes -- an ``except
	json.decoder.JSONDecodeError'' and an ``except json.JSONDecodeError''
	must catch the same thing."

	self @env0:at: #JSONDecodeError put: JSONDecodeError
%

set compile_env: 0
