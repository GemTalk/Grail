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
	"Last chance for a bare name the compiler could not bind -- the BUILTINS
	half of CPython's LOAD_GLOBAL, which searches the module's globals and
	then builtins before raising.  Answers the value if either has one, and
	raises exactly as ___signalUndefined___: does otherwise.

	IT USED TO SEE ONLY INJECTED NAMES, and that made ONE ``global''
	statement poison a builtin for a WHOLE MODULE:

	    def shadow():
	        global all            # anywhere in the module
	        all = lambda x: 'x'

	    def plain_read():
	        return all([1, 1])    # never mentions global -- NameError

	``global all'' promotes ``all'' to a module-scope name, exactly as
	CPython does, so every read of it in the module compiles to a module
	attribute load rather than a builtin reference -- including reads in
	functions that never declared it, and in lambdas.  CPython survives that
	because the global MISS falls back to builtins; Grail's fallback knew
	only about ``builtins.__dict__[name] = value'' injections, so it did not
	find ``all'' and every such read raised NameError.  Reading a name you
	intend to shadow BEFORE assigning it is the ordinary save-and-restore
	idiom, so this was a live trap, not a test artifact (test_builtin
	test_all, test_any, test_callable, test_general_eval).

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

	| b inst v sym |
	sym := aName @env0:asSymbol.
	b := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #builtins.
	b == nil ifTrue: [^ self ___signalUndefined___: aName].
	inst := [b @env0:___instance___] @env0:on: Error do: [:ex | nil].
	inst == nil ifTrue: [^ self ___signalUndefined___: aName].
	"INJECTED names first, and UNGATED: anything at all may be written into
	builtins at run time, so the curated list below must not police this arm."
	v := inst @env0:dynamicInstVarAt: sym ifAbsent: [nil].
	v == nil ifFalse: [^ v].
	"Then the REAL builtins, through the same chain codegen resolves them
	with (NameAst >> emitBuiltinFirstClassRead:on:) -- ___globalAt___: wraps
	a builtins METHOD as a BoundMethod and caches the wrap, so ``all is all''
	stays true, and answers a builtins CLASS (TypeError, int) directly.

	GATED on ___builtinNamespaceNames___ for the reason NameAst >>
	isResolvableSymbol: is: the builtins class is also Grail's implementation
	namespace, so an ungated probe resolves names CPython would not -- an
	undefined ``instance'' or ``new'' would come back as a BoundMethod
	instead of raising.  The curated list is exactly CPython's builtins
	namespace."
	(b @env0:___builtinNamespaceNames___ @env0:includes: sym) ifTrue: [
		^ inst @env1:___globalAt___: sym
			otherwise: [self ___signalUndefined___: aName]].
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
