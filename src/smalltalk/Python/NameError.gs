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
	"A RUNNING exec()/eval() MAY HAVE BEEN HANDED A LIVE LOCALS MAPPING, one
	Grail could not copy into the doit's scope -- so the name misses the scope
	and arrives here.  It is a LOCAL, so it is looked up before builtins and
	before the override, exactly where the scope copy would have put it."
	(inst @env1:___grailLiveLocals___) @env0:isNil ifFalse: [
		| found |
		found := inst
			@env1:___lookUpInLiveLocals___: aName
			ifAbsent: [#'___grailLiveLocalsMiss___'].
		(found @env0:== #'___grailLiveLocalsMiss___') ifFalse: [^ found]].
	"AND THE GLOBALS MAPPING MAY BE LIVE TOO, for the same reason and one
	argument over.  After the locals, before builtins -- that is the order a
	seeded scope would have produced."
	(inst @env1:___grailLiveGlobals___) @env0:isNil ifFalse: [
		| found |
		found := inst
			@env1:___lookUpInLiveGlobals___: aName
			ifAbsent: [#'___grailLiveLocalsMiss___'].
		(found @env0:== #'___grailLiveLocalsMiss___') ifFalse: [^ found]].
	"A RUNNING exec()/eval() MAY HAVE REPLACED BUILTINS ENTIRELY.  CPython
	takes a piece of code's builtins namespace from its globals, so
	``exec(src, {'__builtins__': {}})'' runs source with none, and
	``{'__builtins__': m}'' runs it with m's.  That is an exclusive choice,
	not an extra place to look: falling through to the real builtins after
	the override missed would hand back exactly the name the caller took
	away, which is the whole point of passing an empty one."
	(inst @env1:___grailBuiltinsOverride___) @env0:isNil ifFalse: [
		^ inst
			@env1:___lookUpInBuiltinsOverride___: aName
			ifAbsent: [self ___signalUndefined___: aName]].
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
___requireBuildClass___
	"Refuse a class statement whose builtins namespace has no
	``__build_class__''.

	CPython's LOAD_BUILD_CLASS looks the name up in the code's builtins and
	raises NameError with the bare text ``__build_class__ not found'' -- not
	the usual ``name '...' is not defined'', which is why this does not go
	through ___signalUndefined___:.

	Emitted by ClassDefAst only inside a doit under a ``__builtins__''
	override, so an ordinary class definition never reaches it."

	| b inst |
	b := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #builtins.
	b == nil ifTrue: [^ nil].
	inst := [b @env0:___instance___] @env0:on: Error do: [:ex | nil].
	inst == nil ifTrue: [^ nil].
	(inst @env1:___grailBuiltinsOverride___) @env0:isNil ifTrue: [^ nil].
	^ inst
		@env1:___lookUpInBuiltinsOverride___: '__build_class__'
		ifAbsent: [ | instance |
			instance := self @env1:___new___.
			instance @env1:___args___: { '__build_class__ not found' }.
			instance @env1:___signal___: '__build_class__ not found']
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
