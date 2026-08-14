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
___resolveBuiltinOrSignal___: aName
	"Last chance for a bare name the compiler could not bind: a name INJECTED
	into builtins at run time.  Answers the value if one is there, and raises
	exactly as ___signalUndefined___: does otherwise.

	``builtins.__dict__[name] = value'' is a real Python idiom, and gettext is
	its canonical user -- ``gettext.install()'' publishes the translation
	function as ``_'' so that ``_('msg')'' works everywhere afterwards.  Grail
	resolved names entirely at COMPILE time, so a name that did not exist yet
	compiled to an unconditional raise and no later injection could be seen.
	The gap was general, not about ``_'': any injected name failed the same
	way.

	Called ONLY where the old code raised unconditionally, which is what makes
	it safe: a name that resolves today never reaches here, so no working
	lookup changes and nothing is added to the hot path.  A miss still raises
	the same NameError, with the same message and the same ``name'' attribute.

	Note the ``_'' spelling.  PythonParser renames ``_'' to ___unused___ (a
	bare underscore is not a valid Smalltalk identifier), so compiled code
	reads the renamed name; gettext's install() publishes BOTH spellings, and
	this resolver simply answers whichever it is asked for."

	| b inst v |
	b := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #builtins.
	b == nil ifFalse: [
		inst := [b @env0:___instance___] @env0:on: Error do: [:ex | nil].
		inst == nil ifFalse: [
			v := inst @env0:dynamicInstVarAt: aName @env0:asSymbol ifAbsent: [nil].
			v == nil ifFalse: [^ v]]].
	^ self ___signalUndefined___: aName
%

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
