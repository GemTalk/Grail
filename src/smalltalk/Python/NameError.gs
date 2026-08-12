! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- NameError
expectvalue /Class
doit
Exception subclass: 'NameError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
NameError category: 'Grail-Exceptions'
%

! ------------------- CPython's ``name'' attribute
set compile_env: 0

category: 'Grail-Name Errors'
classmethod: NameError
___signalUndefined___: aName
	"Raise NameError for an unbound name, carrying CPython's ``name'' attribute.

	``name'' is what traceback.py needs to say anything helpful: it is the
	misspelling to match candidates against, and it is also tested directly
	against sys.stdlib_module_names to produce
	``Did you forget to import 'io'?''.  Without it neither is computable.

	Stored as a dynamic instVar under its own Python name, the idiom __notes__
	uses -- ___pyAttrLoad___ probes dynamic instVars before the method chain, so
	``e.name'' answers the value rather than a BoundMethod."

	| instance msg |
	msg := 'name ''' @env0:, aName @env0:asString @env0:, ''' is not defined'.
	instance := self @env1:___new___.
	instance @env1:___args___: { msg }.
	instance @env0:dynamicInstVarAt: #'name' put: aName @env0:asString.
	^ instance @env1:___signal___: msg
%
