Extension { #name : 'Object' }

{ #category : 'Grail-Comparison' }
Object class >> ___builtinValueClass___ [
	"nil: this class is not the root of a builtin's Python subclasses.
	AbstractPyInt, AbstractPyFloat and AbstractPyStr answer the kernel class of
	their builtin's values -- see Object >> ___reflectedFirst___ (#1495)."

	^ nil

]

{ #category : 'Grail-Attribute Access' }
Object class >> ___directCallParse___: aSelector [
	"The Python attribute pyName a direct-call selector spells, as
	{ nameSymbol. isDunder }, or #'___noRecover___' when the selector is not a
	Python call shape: a bare pyName or ``name:'' / ``name:_:'' / ... (every
	keyword after the first is ``_''); never a ``___''-prefixed Grail protocol
	pyName; never the ``_name:kw:'' varargs spelling.  Called once per selector
	-- ___directCallRecover___:args: memoises the answer per session, because
	this string work measured ~900 ns and the whole recovery is on the path of
	every call to a stored callable."

	| s colonIdx pyName parts |
	s := aSelector @env0:asString.
	s @env0:isEmpty ifTrue: [^ #'___noRecover___'].
	colonIdx := s @env0:indexOf: $:.
	pyName := colonIdx @env0:= 0 ifTrue: [s] ifFalse: [s @env0:copyFrom: 1 to: colonIdx @env0:- 1].
	pyName @env0:isEmpty ifTrue: [^ #'___noRecover___'].
	(pyName @env0:size @env0:>= 3 and: [(pyName @env0:copyFrom: 1 to: 3) @env0:= '___'])
		ifTrue: [^ #'___noRecover___'].
	colonIdx @env0:= 0 ifFalse: [
		"``subStrings:'' keeps a trailing EMPTY part (``foo:'' -> ('foo' ''),
		``foo:_:'' -> ('foo' '_' '')), so an empty part is accepted too."
		parts := s @env0:subStrings: $:.
		2 @env0:to: parts @env0:size do: [:i | | part |
			part := parts @env0:at: i.
			(part @env0:isEmpty or: [part @env0:= '_']) ifFalse: [^ #'___noRecover___']]].
	^ { pyName @env0:asSymbol.
		pyName @env0:size @env0:> 4
			and: [(pyName @env0:copyFrom: 1 to: 2) @env0:= '__'
			and: [(pyName @env0:copyFrom: pyName @env0:size @env0:- 1 to: pyName @env0:size) @env0:= '__']] }

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailClassAttrSetterDiverts___ [
	"Asked on entry by every SYNTHESIZED setter whose selector a Python call can
	also spell -- the class-side class-attribute accessor ``attr:'' ('Grail-Class
	Attrs') and the instance-side read-only-@property / @cached_property
	setters ('Grail-Property-ReadOnly' / 'Grail-CachedProperty-Setter'), all
	emitted by ClassDefAst: true when the send that reached it is a Python CALL
	rather than a store -- GRAIL_DIRECT_CALLS is on and no Grail store
	(___grailPerformClassAttrSetter___:on:with:) is in progress.  The setter then
	answers ``(self ___pyAttrLoad___: #attr) value: {arg} value: nil'', which is
	what ``Cls.attr(x)'' / ``obj.prop(x)'' means in Python, instead of storing the
	argument or raising ``no setter''.  A USER-WRITTEN @x.setter is an ordinary
	compiled method and is not guarded: ``obj.x(5)'' on a property that has one
	stores (documented residual).  Flag off: always false, one SessionTemps
	read per store."

	((System @env0:__sessionStateAt: 25) @env0:ifNil: [importlib ___directCallsEnabled___]) == true ifFalse: [^ false].
	^ (SessionTemps @env0:current @env0:at: #'GrailClassAttrStoring' otherwise: nil) == nil

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailClassAttrStoring___ [
	"True while ___grailPerformClassAttrSetter___:on:with: is storing through a
	class-side accessor setter -- which is how every Grail store reaches one.
	A PROTOCOL DUNDER's setter asks it (ClassDefAst >> ___isProtocolDunderAttr___:):
	an unmarked send of ``__eq__:'' to a class is ``C == x'', not a store."

	^ (SessionTemps @env0:current @env0:at: #'GrailClassAttrStoring' otherwise: nil) == true

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailClassBodyStoreShadows___: aValue name: aName [
	"GRAIL_DIRECT_CALLS: does a class-body store of aValue under aName shadow a
	compiled method -- i.e. is it worth installing self-send dispatchers for?
	False for the common decorator that answers the very function it was
	handed: ``@abstractmethod'', ``@functools.wraps''-free markers and every
	decorator that sets an attribute and returns its argument store a Bound /
	UnboundMethod for aName's OWN selector, and a dispatcher would only re-send
	to the method it shadows -- at ~0.8 ms of compiles per install, on every
	such def in every stdlib class.  The flag test comes first so the flag-off
	path pays one primitive read."

	| sel base fn nm |
	"A DUNDER is shadowed whatever the flag says.  The flag decides how an
	ordinary ``obj.m()'' call compiles -- with it off, the call loads the
	attribute first and so finds a stored wrapper on its own.  A special
	method is never reached that way: repr(), len(), ``a + b'' send the
	compiled selector (CPython looks special methods up on the TYPE, which is
	the same thing), so with the flag off a decorated ``__repr__'' was stored
	and never run -- reprlib.recursive_repr's wrapper sat on the class while
	repr() recursed through the raw method (test_reprlib's
	test_recursive_repr, a hard stack overflow rather than a RecursionError)."
	nm := aName @env0:asString.
	(((System @env0:__sessionStateAt: 25) @env0:ifNil: [importlib @env0:___directCallsEnabled___]) == true
		or: [nm @env0:size @env0:> 4
			and: [(nm @env0:at: 1) == $_ and: [(nm @env0:at: 2) == $_
			and: [(nm @env0:last) == $_ and: [(nm @env0:at: nm @env0:size @env0:- 1) == $_]]]]])
		ifFalse: [^ false].
	"__init_subclass__ is run ON THE CLASS through performMethod: (PEP 487's
	implicit classmethod) and has its own DNU dispatch; a dispatcher's
	fall-through ``self ___grailOrig___init_subclass__:'' would be a virtual
	send on the class -- ``a Metaclass does not understand''."
	(aName @env0:asString @env0:= '__init_subclass__') ifTrue: [^ false].
	"Never for a SUNDER name (``_generate_next_value_'', ``_missing_'',
	``_value_''): those are enum-protocol hooks that PyEnumTypes performs on a
	FOREIGN receiver (``name'' is the member's name string) through
	with:with:with:performMethod: -- a dispatcher's fall-through is a self-send,
	so on that receiver it is ``a String class does not understand
	#___grailOrig__generate_next_value_:_:_:'' (every test_enum test after the
	first such class, 107 errors on the 9th cut)."
	((aName @env0:asString @env0:size @env0:> 2
		and: [(aName @env0:asString @env0:at: 1) == $_
		and: [(aName @env0:asString @env0:at: 2) ~~ $_
		and: [(aName @env0:asString @env0:last) == $_]]])) ifTrue: [^ false].
	(self ___grailStoredValueIsAProperty___: aValue) ifTrue: [^ false].
	"Descriptors stored by a class body (functools.singledispatchmethod, a
	user __get__ class) shadow the compiled method too -- ___grailCallOverride___
	binds them through __get__."
	fn := aValue.
	(object @env0:___grailIsBindingDescriptor___: aValue) ifTrue: [
		"A staticmethod / classmethod wrapper around aName's OWN def (Grail wraps
		every enum _generate_next_value_ that way, and ``m = staticmethod(m)'' is
		the pre-decorator idiom) is the same no-op store as the bare def: look
		through __func__ and let the selector test below decide."
		fn := [aValue @env1:___pyAttrLoad___: #'__func__']
			@env0:on: AbstractException do: [:e | e @env0:return: nil].
		((fn @env0:isKindOf: BoundMethod) or: [fn @env0:isKindOf: UnboundMethod]) ifFalse: [^ true]].
	(fn == aValue and: [(object @env0:___grailIsPatchableCallable___: aValue) not]) ifTrue: [^ false].
	((fn @env0:isKindOf: BoundMethod) or: [fn @env0:isKindOf: UnboundMethod]) ifTrue: [
		sel := fn @env0:selector.
		sel == nil ifTrue: [^ true].
		base := sel @env0:asString.
		(base @env0:indexOf: $:) @env0:> 0 ifTrue: [base := base @env0:copyFrom: 1 to: (base @env0:indexOf: $:) @env0:- 1].
		((base @env0:at: 1) == $_ and: [sel @env0:asString @env0:endsWith: ':kw:'])
			ifTrue: [base := base @env0:copyFrom: 2 to: base @env0:size].
		base @env0:= aName @env0:asString ifTrue: [^ false]].
	^ true

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailCommittedSelfSendOverrides___ [
	"The committed record of (class -> Python names) whose stores needed a
	self-send dispatcher, or nil before any did.  Read-only: a read never
	creates it (a creation is a write).

	WHY IT IS COMMITTED when the dispatchers are not.  A dispatcher is a
	SESSION method, which is right for a patch -- but an override stored on an
	object that is then committed is DATA, and every later session that uses
	the object needs the dispatcher too.  Measured before this record existed:
	commit ``g.word = f'', and a later session's ``g.word()'' answered the
	override while ``g.greet()'' -- ``self.word()'' -- ran the original.  The
	same holds for a class-body store over a method in a deployed module,
	whose body never re-runs.  So the NAME is recorded -- noted at the store
	and written by the session's next commit (___grailRecordSelfSendOverride___:,
	GrailCommitCoordinator), so a session that never commits writes nothing --
	and each session re-installs the recorded dispatchers
	(___grailInstallRecordedSelfSendOverrides___).
	Reduced-conflict throughout, so two sessions recording different names
	merge; a name already recorded is not written again."

	^ UserGlobals @env0:at: #'GrailCommittedSelfSendOverrides' otherwise: nil

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailCompiledSelectorsForPythonName___: aSymbol [
	"Every env-1 selector, on this class or inherited, that the Python def
	``aSymbol'' compiled to -- as { selector. definingClass } pairs.

	A def compiles to TWO selectors: the calling-convention ``_spam:kw:'' that
	every keyword or defaulted call reaches, and (when the signature allows it)
	a fixed-arity ``spam'' / ``spam:'' / ``spam:_:'' that a simple positional
	self-send reaches directly.  Both have to be intercepted or the fix would
	depend on how the call happens to be written -- which is exactly the
	inconsistency this whole mechanism exists to remove.
	___grailSelectorMatchesPythonName___:name: is what decides, and says why the
	obvious first-keyword test is wrong.

	INHERITED ONES COUNT.  A ``c.m = f'' on an instance whose class inherits m
	must still be seen by ``self.m()'', and the dispatcher then goes on the
	INSTANCE'S OWN class, overriding the inherited method there.  Putting it
	there rather than on the defining class is what keeps ``super().m()''
	correct: super deliberately starts past the receiver's own class, so it
	reaches the untouched original.

	ALL THREE DEF CATEGORIES, via ___isPythonSourceMethodCategory___:, so that
	member accessors, enum members, slot tables and Grail's own runtime methods
	are never wrapped while every spelling of a def is.  Scoping to
	``Grail-Class Methods'' alone -- which this did -- silently skipped the
	FIXED-ARITY FORWARDERS, and those are not an exotic case: a def that
	compiled as varargs because it has a default argument reaches ``m:'' only
	through a forwarder (ClassDefAst 9.36), so ``def m(self, x, flag=False)''
	kept ignoring its own patch through the very call shape this exists for.
	``Grail-Method Aliases'' -- a class-body ``wrapped = m'' -- is the same
	argument.

	KNOWN GAP, recorded rather than papered over: @classmethod and @staticmethod
	compile onto the METACLASS, and this walks only the instance-side chain, so
	patching either installs nothing.  A self-send to a classmethod does not
	reach a plain Smalltalk send in the first place, so the gap costs nothing
	today; it would have to be closed by walking ``self class'' in parallel."

	| found pyName seen walker |
	pyName := aSymbol @env0:asString.
	found := OrderedCollection @env0:new.
	seen := IdentitySet @env0:new.
	"UP THE CHAIN, nearest first.  ``selectorsForEnvironment:'' answers a class's
	OWN selectors, and the commonest patch target is a method the receiver's
	class INHERITS -- a TestCase subclass patching a helper defined on its base,
	or here a plain ``class W(Widget): pass''.  Own-only found nothing for those
	and installed nothing at all, silently.  Nearest wins, so a subclass that
	overrides the method contributes its own version and the base's copy of the
	same selector is skipped."
	walker := self.
	[walker ~~ nil] @env0:whileTrue: [
		(walker @env0:selectorsForEnvironment: 1) @env0:do: [:sel |
			(seen @env0:includes: sel) ifFalse: [
				(self ___grailSelectorMatchesPythonName___: sel name: pyName)
					ifTrue: [
						((self @env1:___isPythonSourceMethodCategory___:
							(walker @env0:categoryOfSelector: sel environmentId: 1))
							or: [(object @env0:___grailModuleFunctionIsPatchable___: sel on: walker)
							or: [object @env0:___grailKernelSelectorIsPatchable___: sel on: walker for: self]])
							ifTrue: [
								seen @env0:add: sel.
								found @env0:add: { sel. walker }]]]].
		walker := walker @env0:superclass].
	^ found @env0:asArray

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailFastOverrideHolderFor___: aSymbol [
	"The fast-path holder for the Python name aSymbol on this class, or nil
	when this class takes the full override probe.

	A holder is a SymbolDictionary binding ___grailFastOverride___ to the
	current override (nil for none).  The dispatcher compiles against it, so
	it reads the override as a literal association; NativeModule >>
	dynamicInstVarAt:put: updates it on every store, so a re-patch or an
	unpatch needs no recompile.  One holder per (class, name), shared by
	every selector spelling of the name.

	Only a NATIVE module qualifies: it has one instance, and Python cannot
	store on its class, so its instance attribute is the only override there
	is.  The holder starts at the value the store that triggered this install
	has already written -- instance stores install after storing."

	| temps reg byName holder |
	(NativeModule ~~ nil and: [self @env0:inheritsFrom: NativeModule]) ifFalse: [^ nil].
	temps := SessionTemps @env0:current.
	reg := temps @env0:at: #'GrailFastOverrideHolders' otherwise: nil.
	reg == nil ifTrue: [
		reg := IdentityKeyValueDictionary @env0:new.
		temps @env0:at: #'GrailFastOverrideHolders' put: reg].
	byName := reg @env0:at: self otherwise: nil.
	byName == nil ifTrue: [
		byName := IdentityKeyValueDictionary @env0:new.
		reg @env0:at: self put: byName].
	holder := byName @env0:at: aSymbol @env0:asSymbol otherwise: nil.
	holder == nil ifTrue: [
		holder := SymbolDictionary @env0:new.
		holder @env0:at: #'___grailFastOverride___'
			put: ((self @env1:instance) @env0:dynamicInstVarAt: aSymbol @env0:asSymbol).
		byName @env0:at: aSymbol @env0:asSymbol put: holder].
	^ holder

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailFirstKeyword___: aSelectorString [
	"aSelectorString up to (not including) its first colon -- all of it for a
	unary selector."

	| idx |
	idx := aSelectorString @env0:indexOf: $:.
	idx @env0:= 0 ifTrue: [^ aSelectorString].
	^ aSelectorString @env0:copyFrom: 1 to: idx @env0:- 1

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailFlushPendingSelfSendOverrides___ [
	"Write every pair this session noted into the committed record, just
	before a commit (GrailCommitCoordinator >> commit:, and the Python-visible
	commit in System.gs).  The pending set is kept: it is emptied only once a
	commit has succeeded (___grailForgetPendingSelfSendOverrides___), so a
	commit that fails on a conflict and is then aborted writes the pairs again
	on the next attempt.  Writing a pair twice is a no-op."

	| pending |
	pending := SessionTemps @env0:current
		@env0:at: #'GrailPendingSelfSendOverrides' otherwise: nil.
	pending == nil ifTrue: [^ self].
	pending @env0:keysAndValuesDo: [:cls :names |
		names @env0:do: [:sym | cls ___grailWriteSelfSendOverride___: sym]].
	^ self

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailForgetPendingSelfSendOverrides___ [
	"A commit carried the pending pairs; drop them."

	SessionTemps @env0:current
		@env0:removeKey: #'GrailPendingSelfSendOverrides' otherwise: nil.
	^ self

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailInstallOneDispatcher___: aSelector definedIn: definingClass name: aSymbol [
	"Compile the shadow copy and the dispatcher for one selector.

	THE SHADOW IS ``___grailOrig_'', the same name and the same mechanism
	``del D.m'' uses (___pyAttrDelete___, and BoundMethod >>
	___pinnedSelectorFor___:receiver:), and the selector is PINNED here for the
	same reason it is pinned there: a BoundMethod holds a receiver and a
	SELECTOR, so a capture made before the patch would otherwise re-send into
	the dispatcher this is installing.

	That is not a hypothetical.  ``mock.patch.object(obj, 'm', wraps=obj.m)''
	captures ``obj.m'' and then stores a Mock that calls it -- an unbounded
	recursion through the dispatcher, where CPython's captured bound method
	holds the FUNCTION and simply runs the original.  Pinning makes the capture
	resolve to the shadow, which IS the original, so the re-entrance cannot
	happen at all.  The generation stamped on each BoundMethod is what keeps a
	capture made AFTER the patch seeing the patch."

	| orig shadowSel keywords nargs ws argNames fast |
	orig := definingClass @env0:compiledMethodAt: aSelector environmentId: 1.
	orig == nil ifTrue: [^ self].
	"A Grail-generated method's SELECTOR PATTERN is the first token of its
	source, so prefixing the whole source renames the first keyword and leaves
	the argument names, the body and every other keyword untouched.  The copy
	goes through importlib's copier: a TEXT method is recompiled from its
	source, prefixed; an IR-built method (GRAIL_IR_CODEGEN) has PYTHON for its
	sourceString and is recompiled from its text twin or SHARED under the
	shadow key instead -- prefixing its source compiled nothing, the
	fall-through DNU'd, and a metaclass storing the body's defs recursed here."
	shadowSel := ('___grailOrig_' @env0:, aSelector @env0:asString) @env0:asSymbol.
	"NEVER OVERWRITE A SHADOW THIS CLASS ALREADY OWNS.  What answers to the
	selector NOW, after an earlier install, is the DISPATCHER -- shadowing that
	would make the dispatcher's own fall-through send reach itself.  An
	existing shadow is already the pristine original, which is exactly what
	is wanted."
	((self @env0:whichClassIncludesSelector: shadowSel environmentId: 1) == self)
		ifFalse: [
			importlib @env0:___copySessionMethod___: aSelector from: definingClass to: self
				prefix: '___grailOrig_'].
	"NO SHADOW, NO DISPATCHER.  The copier compiles nothing for a method whose
	source is not Grail-generated text (a kernel .gs method, an IR build with
	no text twin); a dispatcher whose fall-through has nowhere to go is the
	MNU the 9th cut showed on every later enum class.  Leave the original in
	place instead -- the store is still visible through the loader."
	((self @env0:whichClassIncludesSelector: shadowSel environmentId: 1) == self)
		ifFalse: [^ self].
	BoundMethod @env1:___grailPinSelector___: aSelector in: self.
	"A VARARGS def ``_m: pos kw: kw'' ends in the forward ``^ self m: a b'' to its
	fixed-arity twin.  In the shadow that forward must reach the twin's SHADOW,
	not the dispatcher now answering to ``m:'' -- otherwise a decorator that
	captured the function before the store (test.support.subTests, any wrapper
	stored at class-build time) runs wrapper -> pinned shadow -> forward ->
	dispatcher -> wrapper without end.  The forward is the source's last
	``^ self <name>'' token; an IR-built shadow has Python for its source, so
	the marker is absent there and nothing is rewritten."
	((aSelector @env0:asString @env0:endsWith: ':kw:')
		and: [(aSelector @env0:asString @env0:at: 1) == $_]) ifTrue: [
		| sh src marker idx last |
		sh := self @env0:compiledMethodAt: shadowSel environmentId: 1 otherwise: nil.
		(sh @env0:notNil and: [(sh @env0:sourceString) @env0:notNil]) ifTrue: [
			src := sh @env0:sourceString @env0:asString.
			marker := '^ self ' @env0:, aSymbol @env0:asString.
			last := 0.
			idx := src @env0:findString: marker startingAt: 1.
			[idx @env0:> 0] @env0:whileTrue: [
				last := idx.
				idx := src @env0:findString: marker startingAt: idx @env0:+ 1].
			(last @env0:> 0
				and: [last @env0:+ marker @env0:size @env0:> src @env0:size
					or: [(src @env0:at: last @env0:+ marker @env0:size) @env0:isAlphaNumeric @env0:not]]) ifTrue: [
				src := (src @env0:copyFrom: 1 to: last @env0:+ 6) @env0:, '___grailOrig_'
					@env0:, (src @env0:copyFrom: last @env0:+ 7 to: src @env0:size).
				"With the original's scope: a method from exec'd source reads the
				exec's globals through it (Behavior >> ___grailRememberCompileScope___:)."
				self @env1:___compileSessionMethod: src category: 'Grail-Dynamic Rebinding Originals'
					scope: definingClass @env1:___grailCompileScope___]]].
	keywords := aSelector @env0:asString @env0:subStrings: $:.
	nargs := aSelector @env0:asString @env0:occurrencesOf: $:.
	argNames := Array @env0:new: nargs.
	1 to: nargs do: [:i | argNames @env0:at: i put: '___a' @env0:, i @env0:printString @env0:, '___'].
	ws := WriteStream @env0:on: String @env0:new.
	nargs @env0:= 0
		ifTrue: [ws nextPutAll: aSelector @env0:asString]
		ifFalse: [
			1 to: nargs do: [:i |
				i @env0:> 1 ifTrue: [ws nextPut: $ ].
				ws nextPutAll: (keywords @env0:at: i); nextPutAll: ': ';
					nextPutAll: (argNames @env0:at: i)]].
	"THE FAST PATH, for a NATIVE module (NativeModule): it has exactly one
	instance, and Python cannot store on its class (``type(builtins)'' is
	``module''), so an override there is the instance attribute and nothing
	else.  The dispatcher reads it straight from a literal -- an association
	in a per-(class, name) holder that NativeModule >> dynamicInstVarAt:put:
	keeps current -- instead of walking the instance and every class in the
	chain on each call.  Everywhere else the full probe stays, because an
	instance attribute on ONE object must not reach its siblings."
	fast := self @env0:___grailFastOverrideHolderFor___: aSymbol.
	ws nextPutAll: '
	| ___ov___ |
	___ov___ := '.
	fast == nil
		ifTrue: [
			ws nextPutAll: 'self @env0:___grailSelfSendOverrideFor___: #'''.
			ws nextPutAll: aSymbol @env0:asString.
			ws nextPutAll: '''']
		ifFalse: [ws nextPutAll: '___grailFastOverride___'].
	ws nextPutAll: '.
	___ov___ == nil ifTrue: [^ self '.
	nargs @env0:= 0
		ifTrue: [ws nextPutAll: shadowSel @env0:asString]
		ifFalse: [
			| skw |
			skw := shadowSel @env0:asString @env0:subStrings: $:.
			1 to: nargs do: [:i |
				i @env0:> 1 ifTrue: [ws nextPut: $ ].
				ws nextPutAll: (skw @env0:at: i); nextPutAll: ': ';
					nextPutAll: (argNames @env0:at: i)]].
	ws nextPutAll: '].
	^ self @env0:___grailCallOverride___: '.
	ws nextPutAll: (fast == nil ifTrue: ['___ov___'] ifFalse: ['{ false. ___ov___ }']).
	ws nextPutAll: ' name: #'''.
	ws nextPutAll: aSymbol @env0:asString.
	ws nextPutAll: ''' args: '.
	"The varargs selector already HAS the positional array and the keyword dict
	as its two arguments; every other shape passes its arguments positionally."
	(aSelector @env0:asString @env0:endsWith: ':kw:')
		ifTrue: [
			ws nextPutAll: (argNames @env0:at: 1); nextPutAll: ' kw: ';
				nextPutAll: (argNames @env0:at: 2)]
		ifFalse: [
			ws nextPut: ${; nextPut: $ .
			1 to: nargs do: [:i |
				ws nextPutAll: (argNames @env0:at: i); nextPutAll: '. '].
			ws nextPutAll: '} kw: nil'].
	"A SESSION method (Behavior >> ___compileSessionMethod:category:scope:):
	the patch that asked for it is this session's, so the dispatcher is too.
	Nothing is committed, no other session pays for it, and two sessions
	patching one class cannot conflict."
	self @env1:___compileSessionMethod: ws contents category: 'Grail-Class Methods' scope: fast.
	"Per-session tally of installs, so a fixture or a suite run can report how
	often a callable store actually shadowed a compiled method."
	SessionTemps @env0:current @env0:at: #'GrailSelfSendDispatcherInstalls'
		put: (SessionTemps @env0:current @env0:at: #'GrailSelfSendDispatcherInstalls' otherwise: 0) @env0:+ 1.
	^ self

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailInstallRecordedSelfSendOverrides___ [
	"Once per session: install the session dispatchers for every recorded
	(class, name), so an override committed in an earlier session reaches this
	session's self-sends.  Called from the two points every Python execution
	passes before it can reach a committed object -- importlib's per-session
	registry check and the session's first native-module singleton.  A class
	the record names but a later install replaced is skipped: it is not the
	class any live code runs."

	| temps reg |
	temps := SessionTemps @env0:current.
	(temps @env0:at: #'GrailRecordedDispatchersInstalled' otherwise: nil) == true
		ifTrue: [^ self].
	"A record from before the last install names classes that install
	replaced, and importlib's generation check is about to wipe it: not yet
	current, so not yet done -- the check calls back once it has decided."
	(UserGlobals @env0:at: #'GrailCanonicalDeployGeneration' otherwise: nil)
		= (UserGlobals @env0:at: #'GrailRuntimeGeneration' otherwise: 0)
			ifFalse: [^ self].
	temps @env0:at: #'GrailRecordedDispatchersInstalled' put: true.
	reg := self ___grailCommittedSelfSendOverrides___.
	reg == nil ifTrue: [^ self].
	reg @env0:keysAndValuesDo: [:cls :names |
		names @env0:asIdentitySet @env0:do: [:sym |
			[cls ___grailInstallSelfSendDispatchers___: sym]
				@env0:on: Error do: [:e | e @env0:return: nil]]].
	^ self

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailInstallSelfSendDispatchers___: aSymbol [
	"Make ``self.<aSymbol>(...)'' inside this class's own methods honour an
	override, by replacing the compiled method the self-send resolves to.

	WHY THE CALL SITE CANNOT DO IT.  ``self.m(x)'' compiles to a plain Smalltalk
	send, which is the single hottest shape in the system; a guard there costs
	47% of a full Python call, measured, on EVERY intra-object call in the
	corpus whether anything is ever patched or not.  Replacing the method the
	send resolves to moves the whole cost to patch time: unpatched code compiles
	and runs byte-identically.

	HOW.  The original is recompiled under a shadow selector -- its source is
	prefixed with ``___grailOrig_'', which renames the first keyword and nothing
	else, because a Grail-generated method's pattern is its first token.  A
	dispatcher then takes the original selector, probes for an override and
	falls through to the shadow when there is none.  The shadow is a real
	method, so the fall-through is an ordinary send with no registry to keep in
	step and no way to loop.

	ANSWERS FALSE when there is nothing to do -- no compiled method of that name,
	or this class has already been asked about it.

	NOTED BEFORE THE SCAN, and for both answers.  Before, so a store triggered
	from inside the compile cannot start a second install of the same name; for
	both, so a name that is not a method is scanned once rather than on every
	store (see ___grailSelfSendNameConsidered___:).

	ONE HANDLER, and it is at the CALL SITE in ___pyAttrStore___ rather than
	around each selector here -- two nested ones made a genuine breakage in this
	machinery invisible.  It still is quiet: because the name is noted before
	the scan, a raise anywhere below disables the override for that name for the
	rest of the session.  That is the deliberate trade -- the alternative is
	un-noting so a later store retries, which turns a permanently broken case
	into a chain-wide selector scan on every store -- but it does mean the SUnit
	suite, not this method, is what tells you the mechanism has stopped
	working."

	| sym pairs |
	sym := aSymbol @env0:asSymbol.
	(self ___grailSelfSendNameConsidered___: sym) ifTrue: [^ false].
	self ___grailNoteSelfSendNameConsidered___: sym.
	pairs := self ___grailCompiledSelectorsForPythonName___: sym.
	pairs @env0:isEmpty ifTrue: [^ false].
	pairs @env0:do: [:each |
		self ___grailInstallOneDispatcher___: (each @env0:at: 1)
			definedIn: (each @env0:at: 2) name: sym].
	(self @env0:inheritsFrom: NativeModule) ifTrue: [
		self ___grailRelinkNativeShadows___: pairs].
	self ___grailRecordSelfSendOverride___: sym.
	^ true

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailIsBindingDescriptor___: aValue [
	"A Python-level descriptor: not a function / block / method wrapper / class,
	and its class answers __get__ in env 1 (fixed or varargs spelling)."

	| cls |
	aValue == nil ifTrue: [^ false].
	((aValue @env0:isKindOf: ExecBlock) or: [(aValue @env0:isKindOf: BoundMethod)
		or: [(aValue @env0:isKindOf: UnboundMethod) or: [aValue @env0:isKindOf: Behavior]]])
			ifTrue: [^ false].
	cls := aValue @env0:class.
	^ ((cls @env0:whichClassIncludesSelector: #'__get__:_:' environmentId: 1) ~~ nil)
		or: [(cls @env0:whichClassIncludesSelector: #'___get__:kw:' environmentId: 1) ~~ nil]

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailIsPatchableCallable___: aValue [
	"Is this stored value worth checking for a method it might shadow?

	The whole mechanism exists for monkey-patching -- assigning a function, a
	lambda, a bound method or a Mock over a name the class compiles as a method.
	Everything else is an ordinary data attribute, and this runs on EVERY
	``___pyAttrStore___'', so what it costs for ``self.count = 0'' is what it
	costs the corpus.

	WHAT IT COSTS, stated rather than asserted.  A function, bound method or
	unbound method answers on one ``isKindOf:''; a class is rejected on a
	second.  Everything else -- every integer, string, list and dict a program
	ever stores -- reaches the __call__ probe and pays up to three method-
	dictionary lookups.  That is the price of admitting Mocks, which are
	ordinary Python instances carrying __call__ and are precisely the shape
	``mock.patch.object'' installs.

	The probe is ``whichClassIncludesSelector:environmentId:'' and not
	``___respondsTo___:'' deliberately: the latter expands each name into its
	seven-selector family and can raise, so it needed an exception handler
	around the whole test.  A dictionary lookup answers the same question here,
	cannot raise, and does not need one."

	| cls |
	aValue == nil ifTrue: [^ false].
	(aValue @env0:isKindOf: ExecBlock) ifTrue: [^ true].
	(aValue @env0:isKindOf: BoundMethod) ifTrue: [^ true].
	(aValue @env0:isKindOf: UnboundMethod) ifTrue: [^ true].
	"functools.lru_cache's wrapper is a Smalltalk object whose call entry is
	spelled ``___call___:kw:'' (Grail-internal), not the Python ``__call__''
	family probed below -- so a class-body ``@lru_cache def f'' stored no
	dispatcher and, under GRAIL_DIRECT_CALLS, ``a.f(x)'' reached the RAW method:
	test_functools test_lru_method counted 10 body runs for 6 (cache_info stayed
	at 0/0).  Reproduced standalone; see scratchpad/attr-accessors-log.md."
	(aValue @env0:isKindOf: LruCacheWrapper) ifTrue: [^ true].
	"A CLASS stored over a name is not the shape this serves, and
	``self.cls = SomeClass'' is common enough that scanning selectors for it
	would be a real cost for no benefit."
	(aValue @env0:isKindOf: Behavior) ifTrue: [^ false].
	cls := aValue @env0:class.
	((cls @env0:whichClassIncludesSelector: #'___call__:kw:' environmentId: 1)
		~~ nil) ifTrue: [^ true].
	((cls @env0:whichClassIncludesSelector: #'__call__:' environmentId: 1)
		~~ nil) ifTrue: [^ true].
	^ (cls @env0:whichClassIncludesSelector: #'__call__' environmentId: 1) ~~ nil

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailKernelSelectorIsPatchable___: aSelector on: ownerClass for: installingClass [
	"GRAIL_DIRECT_CALLS: may a store over the Python name that aSelector spells
	shadow this INHERITED KERNEL method too?  ``Cls.__reduce_ex__ = f'' then
	``member.__reduce_ex__(p)'' compiles to a direct send that lands on
	object>>__reduce_ex__: -- a Grail runtime method, not a class-body def, so
	the Python-source category filter skipped it and nothing shadowed it; the
	legacy load-then-call had found the stored f.  Flag on, and the owner is not
	a Python-defined class (those are covered by the category rule), and the
	selector is not one with a DNU protocol of its own: the binary-operator
	dunders (___tryBinaryDunderDNU___'s reflected fallback), the item dunders
	(their catchable TypeErrors), the call protocol, and Grail's ``___'' names."

	| s |
	((System @env0:__sessionStateAt: 25) @env0:ifNil: [importlib ___directCallsEnabled___]) == true
		ifFalse: [^ false].
	(ownerClass @env0:inheritsFrom: PythonInstance) ifTrue: [^ false].
	ownerClass == PythonInstance ifTrue: [^ false].
	"Never onto a MODULE class: ``builtins.len = f'' would put a dispatcher on
	builtins>>len:, whose override probe then finds the module's own lazily
	cached BoundMethod for len and re-sends -- 217 RecursionErrors in the
	first suite run with this rule.  Module attributes are read through the
	module's own protocol, not through direct sends to its defs."
	((installingClass @env0:inheritsFrom: module) or: [installingClass == module]) ifTrue: [^ false].
	s := aSelector @env0:asString.
	(s @env0:size @env0:>= 3 and: [(s @env0:copyFrom: 1 to: 3) @env0:= '___']) ifTrue: [^ false].
	"No DUNDER family at all: an explicit dunder call keeps load-then-call
	(CallAst exclusion 8), so the only env-1 sends of a dunder are Grail's own
	protocol code, which already consults the class dict where CPython does
	(Enum.___grailFindDataRepr: walks the ___dynInstVars___ holder for the
	@dataclass __repr__; a dispatcher over object>>__repr__ on the data mixin
	made the member print the mixin's full repr instead)."
	"Nor a SUNDER family (``_generate_next_value_'', ``_missing_''): those are
	enum-protocol hooks Grail's own machinery (PyEnumTypes) resolves by class
	walk and performs itself; a class-body def of one is stored AND compiled,
	and the 9th cut's shadow of the kernel implementation compiled on a class
	the later perform never reaches (107 test_enum errors: ``String class does
	not understand #___grailOrig__generate_next_value_:_:_:'')."
	(s @env0:size @env0:> 2
		and: [(s @env0:at: 1) == $_
		and: [(s @env0:at: 2) ~~ $_
		and: [(s @env0:indexOf: $:) @env0:= 0
			ifTrue: [(s @env0:at: s @env0:size) == $_]
			ifFalse: [(s @env0:at: (s @env0:indexOf: $:) - 1) == $_]]]])
				ifTrue: [^ false].
	(s @env0:size @env0:> 4
		and: [(s @env0:copyFrom: 1 to: 2) @env0:= '__'
		and: [(s @env0:indexOf: $:) @env0:= 0
			ifTrue: [(s @env0:copyFrom: s @env0:size - 1 to: s @env0:size) @env0:= '__']
			ifFalse: [(s @env0:copyFrom: (s @env0:indexOf: $:) - 2 to: (s @env0:indexOf: $:) - 1) @env0:= '__']]])
				ifTrue: [^ false].
	(#(#'__add__:' #'__and__:' #'__divmod__:' #'__floordiv__:' #'__lshift__:' #'__matmul__:' #'__mod__:'
		#'__mul__:' #'__or__:' #'__pow__:' #'__radd__:' #'__rand__:' #'__rfloordiv__:'
		#'__rdivmod__:' #'__rlshift__:' #'__rmatmul__:' #'__rmod__:' #'__rmul__:' #'__ror__:' #'__rpow__:'
		#'__rrshift__:' #'__rshift__:' #'__rsub__:' #'__rtruediv__:' #'__rxor__:' #'__sub__:'
		#'__truediv__:' #'__xor__:'
		#'__getitem__:' #'__setitem__:_:' #'__delitem__:' #'__contains__:'
		#'value:value:' #'__call__:' #'__init__' #'__new__' #'__new__:')
			@env0:includes: aSelector) ifTrue: [^ false].
	^ true

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailModuleFunctionIsPatchable___: aSelector on: ownerClass [
	"GRAIL_DIRECT_CALLS: is aSelector a top-level ``def'' of a .py MODULE, so
	that a runtime store ``mod.f = g'' must shadow it?

	With the flag on, ``x.f(a)'' on a receiver the compiler cannot see is a
	module -- a module held in a global or an attribute: _py_warnings' ``_wm'',
	test_warnings' ``self.module'' -- compiles to the direct send ``x f: a'', and
	a module's top-level def IS a method of its class.  The send ran the
	compiled def and ignored an attribute stored over it, where the
	load-then-call found the store: catch_warnings(record=True) sets
	``_showwarnmsg_impl = log.append'' on the module, _py_warnings then called
	``_wm._showwarnmsg_impl(msg)'', and every warning was printed instead of
	recorded (52 test_warnings failures).

	Top-level defs are filed under 'Grail-Methods' (importlib), not a class-body
	category, so the ordinary rule never saw them.  NativeModule classes stay
	out: their methods are Smalltalk, and ``builtins.len = f'' over builtins>>len:
	was the 217-RecursionError case that kept modules out of
	___grailKernelSelectorIsPatchable___:on:for:.  A module's own cached
	BoundMethod for f, read back by the dispatcher's override probe, is not an
	override (___grailSelfSendOverrideFor___:)."

	(ownerClass @env0:inheritsFrom: module) ifFalse: [^ false].
	"A NativeModule's functions are Smalltalk methods, but ``json.dumps = f''
	(``mock.patch('starlette.responses.json.dumps')'') must reach the direct
	send ``json dumps: x'' as surely as a .py module's, and with or without
	GRAIL_DIRECT_CALLS, since a call to a NativeModule function compiles to
	that send either way.  It reached none of them, so patching any
	Grail-implemented module -- json, math, time, os -- was invisible to every
	other module (FastAPI's test_dump_json_fast_path).
	The selectors offered are only those spelling the Python name (dumps: and
	_dumps:kw:), and a capture taken before the patch -- ``wraps=json.dumps''
	-- reaches the shadow through the pin, not the dispatcher.

	EXCEPT builtins, whose ``builtins.len = f'' was the 217-RecursionError
	case: it has an override mechanism of its own (the pinned builtins
	forwarders), which this must not stack a dispatcher on."
	(ownerClass @env0:inheritsFrom: NativeModule) ifTrue: [
		^ (ownerClass == builtins or: [ownerClass @env0:inheritsFrom: builtins]) @env0:not].
	((System @env0:__sessionStateAt: 25) @env0:ifNil: [importlib ___directCallsEnabled___]) == true
		ifFalse: [^ false].
	^ ((ownerClass @env0:categoryOfSelector: aSelector environmentId: 1) @env0:ifNil: ['']) @env0:asString @env0:= 'Grail-Methods'

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailNoteSelfSendNameConsidered___: aSymbol [
	"Record that this class has been asked about aSymbol -- whether or not a
	dispatcher was installed for it."

	| st reg inner |
	st := SessionTemps @env0:current.
	reg := st @env0:at: self ___grailSelfSendDispatcherKey___ otherwise: nil.
	reg == nil ifTrue: [
		reg := IdentityKeyValueDictionary @env0:new.
		st @env0:at: self ___grailSelfSendDispatcherKey___ put: reg].
	inner := reg @env0:at: self otherwise: nil.
	inner == nil ifTrue: [
		inner := IdentitySet @env0:new.
		reg @env0:at: self put: inner].
	inner @env0:add: aSymbol @env0:asSymbol.
	^ self

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailPerformClassAttrSetter___: setterSym on: aClass with: aValue [
	"Store aValue through aClass's class-side accessor SETTER (``attr:'', category
	'Grail-Class Attrs'), marking the session so the setter knows this is a
	STORE.  Under GRAIL_DIRECT_CALLS the same selector is also what a Python call
	``Cls.attr(x)'' compiles to when the compiler could not tell that the receiver
	is a class, and the generated setter (ClassDefAst) then diverts to the call
	semantics unless this marker is set -- see ___grailClassAttrSetterDiverts___.
	Flag off: a plain perform, as before."

	| temps |
	temps := SessionTemps @env0:current.
	temps @env0:at: #'GrailClassAttrStoring' put: true.
	^ [aClass @env0:perform: setterSym env: 1 withArguments: { aValue }]
		@env0:ensure: [temps @env0:removeKey: #'GrailClassAttrStoring' ifAbsent: []]

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailRecordSelfSendOverride___: aSymbol [
	"Note that this class needed a dispatcher for aSymbol (see
	___grailCommittedSelfSendOverrides___).  Not for a native module: its
	instance state is session state and is never committed.

	NOTED NOW, WRITTEN AT COMMIT (#1466).  Writing the record here made a
	store on a throwaway local -- ``obj.m = wrapper'' on an object nobody
	commits -- dirty the session: ``needsCommit'' turned true, and a refusal
	to start a transaction while dirty, or a later unrelated commit, took
	the entry along.  The record only matters to a session that commits, so
	the pair waits in session state and GrailCommitCoordinator writes it as
	part of the commit, whichever route the commit takes.  When some other
	commit coordinator owns the session, the record is written here as it
	always was, rather than risk losing it."

	| pending names |
	(NativeModule ~~ nil and: [self @env0:inheritsFrom: NativeModule]) ifTrue: [^ self].
	(self ___grailSelfSendOverrideIsRecorded___: aSymbol) ifTrue: [^ self].
	GrailCommitCoordinator @env0:ensureInstalled
		ifFalse: [^ self ___grailWriteSelfSendOverride___: aSymbol].
	pending := SessionTemps @env0:current
		@env0:at: #'GrailPendingSelfSendOverrides' otherwise: nil.
	pending == nil ifTrue: [
		pending := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #'GrailPendingSelfSendOverrides' put: pending].
	names := pending @env0:at: self otherwise: nil.
	names == nil ifTrue: [
		names := IdentitySet @env0:new.
		pending @env0:at: self put: names].
	names @env0:add: aSymbol @env0:asSymbol.
	^ self

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailRelinkNativeShadows___: pairs [
	"Point a NativeModule's shadows at each other.  Its functions are
	hand-written Smalltalk, so the copier SHARES each one under its shadow key
	rather than recompiling it -- and ``dumps: obj'' forwards with ``self
	_dumps: ... kw: nil'', which then reached _dumps:kw:'s DISPATCHER.  With an
	override that wraps the original -- ``mock.patch('json.dumps',
	wraps=json.dumps)'' -- the captured original ran the shadow, the shadow
	forwarded into the dispatcher, the dispatcher called the mock, and so on
	to RecursionError.  So each shadow is recompiled from its own source with
	its sends to the sibling selectors renamed to THEIR shadows, as the
	installer already does for a generated varargs forward: an original only
	ever calls originals.  A shadow that cannot be recompiled is left shared."

	| shadowOf |
	shadowOf := pairs @env0:collect: [:each | | sel |
		sel := (each @env0:at: 1) @env0:asString.
		sel -> ('___grailOrig_' @env0:, sel)].
	pairs @env0:do: [:each | | sel shadowSel meth src |
		sel := each @env0:at: 1.
		shadowSel := ('___grailOrig_' @env0:, sel @env0:asString) @env0:asSymbol.
		meth := self @env0:compiledMethodAt: shadowSel environmentId: 1 otherwise: nil.
		src := meth @env0:ifNotNil: [:m | m @env0:sourceString].
		"The copier recompiled a text source already prefixed; a shared method's
		source still opens with the original pattern."
		(src @env0:notNil and: [(self ___grailString___: src @env0:asString startsWith: '___grailOrig_') @env0:not])
			ifTrue: [src := '___grailOrig_' @env0:, src @env0:asString].
		(src @env0:notNil and: [self ___grailString___: src @env0:asString
				startsWith: (self ___grailFirstKeyword___: shadowSel @env0:asString)])
			ifTrue: [
				src := src @env0:asString.
				shadowOf @env0:do: [:assoc | | other kw |
					other := assoc key.
					other @env0:= sel @env0:asString ifFalse: [
						kw := (other @env0:includes: $:)
							ifTrue: [(self ___grailFirstKeyword___: other) @env0:, ':']
							ifFalse: [other].
						src := src @env0:copyReplaceAll: 'self ' @env0:, kw
							with: 'self ___grailOrig_' @env0:, kw]].
				[self @env1:___compileSessionMethod: src
					category: 'Grail-Dynamic Rebinding Originals']
					@env0:on: AbstractException do: [:ex | ex @env0:return: nil]]]

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailSelectorMatchesPythonName___: aSelector name: pyName [
	"Is aSelector one of the env-1 selectors the Python def ``pyName'' compiles
	to?

	A def has at most two spellings.  The FIXED-ARITY one is ``spam'',
	``spam:'', ``spam:_:'' -- the name, then one ``_'' keyword per extra
	argument (FunctionDefAst >> fixedAritySelectorFor:).  The
	CALLING-CONVENTION one is ``_spam:kw:'' (CallAst >> varargsSelectorForName:),
	which every keyword or defaulted call reaches.

	MATCHING ON THE FIRST KEYWORD ALONE IS NOT ENOUGH, and the case it gets
	wrong is an ordinary one.  For pyName ``_tag'' the selector ``_tag:kw:''
	has ``_tag'' as its first keyword -- but that selector is the
	calling-convention spelling of the def ``tag'', not of ``_tag''.  A class
	carrying both ``tag'' and ``_tag'' is unremarkable, and the loose test made
	a patch of one reach the other.  Requiring every keyword AFTER the first to
	be ``_'' separates them: ``_tag:kw:'' ends in ``kw'', so only the explicit
	varargs spelling above accepts it."

	| s keywords pyStr |
	s := aSelector @env0:asString.
	"A STRING, whichever the caller passed.  ``'f' = #f'' is false in GemStone,
	so a Symbol pyName matched nothing, and the dispatcher's guard against the
	receiver's own bound method -- which passes one -- never fired: storing
	``obj.f = saved'' back after a patch recursed (#1226)."
	pyStr := pyName @env0:asString.
	(s @env0:= ('_' @env0:, pyStr @env0:, ':kw:')) ifTrue: [^ true].
	keywords := s @env0:subStrings: $:.
	keywords @env0:isEmpty ifTrue: [^ false].
	((keywords @env0:at: 1) @env0:= pyStr) ifFalse: [^ false].
	"A colonless selector answers one part; a fixed-arity one answers the name
	followed by an ``_'' per extra argument -- AND A TRAILING EMPTY ONE, because
	``subStrings:'' does not drop it: ``k4:_:_:_:'' answers
	('k4' '_' '_' '_' ''), and ``k4:'' answers ('k4' '').  Rejecting the empty
	part rejected every keyword selector there is, leaving only zero-argument
	methods intercepted -- which no check here could see until one of them took
	arguments through the fixed-arity spelling."
	2 to: keywords @env0:size do: [:i |
		| part |
		part := keywords @env0:at: i.
		(part @env0:isEmpty or: [part @env0:= '_']) ifFalse: [^ false]].
	^ true

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailSelfSendDispatcherKey___ [
	"Where the per-class record of installed dispatchers lives.

	SessionTemps, not the class, and deliberately: the dispatchers themselves
	are TRANSIENT session methods (Behavior >> ___compileSessionMethod:category:),
	so the record has to live and die with them.  Nothing here is committed,
	and a session that ends takes its patches with it."

	^ #'GrailSelfSendDispatchers'

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailSelfSendNameConsidered___: aSymbol [
	"Has this class already been asked about this Python name?

	TRUE FOR BOTH ANSWERS, and the negative one is the expensive half to repeat.
	Recording only successful installs -- which this did -- left every
	``self.callback = fn'' and ``self._hook = lambda ...'' paying a full
	superclass-chain selector enumeration on EVERY store, forever, because a
	name with no compiled method never got recorded.  Stores over a name that
	is not a method are the overwhelming majority, so that was the common case
	and not the rare one.

	It also stops a re-patch wrapping the wrapper: a second install would take
	the DISPATCHER as the original and recurse forever."

	| reg inner |
	reg := SessionTemps @env0:current
		@env0:at: self ___grailSelfSendDispatcherKey___ otherwise: nil.
	reg == nil ifTrue: [^ false].
	inner := reg @env0:at: self otherwise: nil.
	inner == nil ifTrue: [^ false].
	^ inner @env0:includes: aSymbol @env0:asSymbol

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailSelfSendOverrideIsRecorded___: aSymbol [
	"Whether the committed record already names this class and aSymbol.  A
	read: it never creates the record."

	| reg names |
	reg := self ___grailCommittedSelfSendOverrides___.
	reg == nil ifTrue: [^ false].
	names := reg @env0:at: self otherwise: nil.
	^ names ~~ nil and: [names @env0:includes: aSymbol @env0:asSymbol]

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailStoredClassAttrIn___: aClass named: aSymbol overlay: ov [
	"A class attribute STORED on aClass -- session overlay first, then the
	committed ___dynInstVars___ holder -- or nil.

	Two of the three homes a class attribute can have; the third, an accessor
	pair compiled onto the metaclass, is a CLASS BODY definition rather than a
	runtime store and so is never an override of a method defined in the same
	body.  Guarded throughout: this runs on the call path of every patched
	method, and a class that refuses to answer must cost the probe, not the
	call.

	THE OVERLAY IS PASSED IN, not read here, because the caller walks the
	superclass chain and this used to do its own ``SessionTemps current
	at:otherwise:'' per class -- the probe measured at 118% of a whole Python
	call, paid once per ancestor on every call to a patched method.  One read
	at the top of the walk answers for the whole chain: the overlay is a single
	session-wide dictionary and cannot change during it."

	| inner holder owner |
	ov == nil ifFalse: [
		inner := ov @env0:at: aClass otherwise: nil.
		inner == nil ifFalse: [
			| v |
			v := inner @env0:at: aSymbol otherwise: nil.
			v == nil ifFalse: [^ v]]].
	holder := [aClass @env0:perform: #___dynInstVars___ env: 1]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	holder == nil ifFalse: [
		| hv |
		hv := [holder @env0:dynamicInstVarAt: aSymbol]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		hv == nil ifFalse: [^ hv]].
	"The THIRD home, for GRAIL_DIRECT_CALLS: a class-body name assigned
	unconditionally has a CLASS-SIDE accessor pair ('Grail-Class Attrs') and its
	definitional store writes the slot through the setter, not the holder --
	``def m'' followed by ``m = other'' in the same body.  Read the getter when
	the pair exists; the category test keeps compiled methods and Grail's own
	class-side machinery out."
	owner := aClass @env0:class @env0:whichClassIncludesSelector: aSymbol environmentId: 1.
	(owner ~~ nil
		and: [(owner @env0:categoryOfSelector: aSymbol environmentId: 1) @env0:= #'Grail-Class Attrs'])
		ifTrue: [
			^ [aClass @env0:perform: aSymbol env: 1]
				@env0:on: AbstractException do: [:ex | ex @env0:return: nil]].
	^ nil

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailStoredValueIsAProperty___: aValue [
	"Is aValue a ``property'' (or enum.property)?  Storing one on a class never
	installs self-send dispatchers.

	A property lives on ACCESSOR selectors -- its getter ``p'' and setter
	``p:'', its own or inherited from a base's property -- and the attribute
	protocol PERFORMS those selectors for every read and store of the
	attribute.  A dispatcher over them took each read and store for a CALL of
	the bound value: under GRAIL_DIRECT_CALLS ``ctx.maximum_version = v'' in
	ssl.py (SSLContext's property over _SSLContext's) raised 'TLSVersion'
	object is not callable and test_ssl could not import, and reading an
	``@typing.override @property'' raised 'str' object is not callable.

	Reads and stores resolve the right property without a dispatcher -- they
	always have with the flag off.  What a dispatcher would add is only a
	direct CALL of the property's value (``obj.p(x)''), which CallAst keeps on
	load-then-call for the class's own properties (___directCallSelector___,
	exclusion 10)."

	^ aValue @env0:isKindOf: AbstractPropertyDescriptor

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailString___: aString startsWith: aPrefix [
	"Whether aString opens with aPrefix."

	^ aString @env0:size @env0:>= aPrefix @env0:size
		and: [(aString @env0:copyFrom: 1 to: aPrefix @env0:size) @env0:= aPrefix]

]

{ #category : 'Grail-Self-Send Overrides' }
Object class >> ___grailWriteSelfSendOverride___: aSymbol [
	"Add this class and aSymbol to the committed record, creating it on first
	use.  Reduced-conflict throughout, so two sessions recording different
	names merge; a name already recorded is not written again."

	| reg names |
	reg := self ___grailCommittedSelfSendOverrides___.
	names := reg == nil ifTrue: [nil] ifFalse: [reg @env0:at: self otherwise: nil].
	(names ~~ nil and: [names @env0:includes: aSymbol @env0:asSymbol]) ifTrue: [^ self].
	reg == nil ifTrue: [
		reg := RcKeyValueDictionary @env0:new.
		UserGlobals @env0:at: #'GrailCommittedSelfSendOverrides' put: reg].
	names == nil ifTrue: [
		names := RcIdentityBag @env0:new.
		reg @env0:at: self put: names].
	names @env0:add: aSymbol @env0:asSymbol.
	^ self

]

{ #category : 'Grail-Bridge' }
Object class >> ___new___: arg [
	"Convenience method: self perform: #__new__: env: 1 withArguments: {arg}"
	^ self @env1:__new__: arg

]

{ #category : 'Grail-Bridge' }
Object class >> ___new___: arg1 _: arg2 [
	"Convenience method: self perform: #__new__:_: env: 1 withArguments: {arg1. arg2}"
	^ self @env1:__new__: arg1 _: arg2

]

{ #category : 'Grail-Bridge' }
Object class >> ___new___: arg1 _: arg2 _: arg3 [
	"Convenience method: self perform: #__new__:_:_: env: 1 withArguments: {arg1. arg2. arg3}"
	^ self @env1:__new__: arg1 _: arg2 _: arg3

]

{ #category : 'Grail-Attribute Access' }
Object >> ___directCallRecover___: aSelector args: anArray [
	"GRAIL_DIRECT_CALLS: finish a Python attribute CALL whose direct keyword send
	missed.  Under the flag CallAst compiles ``recv.foo(a, b)'' to the plain
	env-1 send ``recv foo: a _: b'' (see CallAst>>___directCallSelector___), so
	a receiver with no such method arrives here, from the
	doesNotUnderstand:args:envId: hooks on object and PythonInstance.

	Python's semantics for the same expression is LOAD then CALL, so that is
	what the miss does: load ``foo'' through ___pyAttrLoad___: -- which is
	where instance attributes holding callables, __getattr__, properties, class
	attributes that are classes, bound and unbound methods, module attributes
	and inferred-slot accessors all resolve -- and invoke the result through
	the universal call protocol ``value: args value: nil'' (a BoundMethod checks
	arity and raises TypeError; a class constructs; a block activates; a
	non-callable reaches object>>value:value: and its ``not callable'' TypeError).

	A MISSING attribute raises the loader's AttributeError (``'X' object has no
	attribute 'foo''', carrying name and obj so ``Did you mean'' works) --
	EXCEPT for a dunder name.  Grail's own machinery soft-misses dunders
	(``[x __len__] on: MessageNotUnderstood'' in truthiness, len(), dict(),
	random, statistics, ...) and the hooks turn some into CPython's TypeErrors
	(item and unary-operand dunders); a missing dunder therefore answers
	#'___noRecover___' and the hook continues into those tails exactly as it
	did before the flag existed.

	Only Python-shaped selectors are recovered -- ___directCallParse___: says
	which, and its answer is memoised per selector in session-state slot 26
	(the string work is ~900 ns, the memo lookup ~80).  Answers #'___noRecover___' for
	everything it declines, so the caller falls through."

	| memo entry attr |
	"Session-state slot 26 holds the per-session selector -> parse memo; a
	primitive read (16 ns) where ``SessionTemps current'' alone was 74."
	memo := System @env0:__sessionStateAt: 26.
	memo == nil ifTrue: [
		memo := IdentityKeyValueDictionary @env0:new.
		System @env0:__sessionStateAt: 26 put: memo].
	entry := memo @env0:at: aSelector otherwise: nil.
	entry == nil ifTrue: [
		entry := object @env0:___directCallParse___: aSelector.
		memo @env0:at: aSelector put: entry].
	entry == #'___noRecover___' ifTrue: [^ entry].
	(entry @env0:at: 2) ifTrue: [
		"A DUNDER on a CLASS receiver is Grail's own protocol probing the
		class (``bool(dict)'' sends __bool__ / __len__ to the class object and
		expects the MNU its soft-miss handler catches); the loader would answer
		the instance method as an UnboundMethod and calling it raises a
		different TypeError.  Decline, so the hook's tails run as before.
		Only the ARGUMENT-LESS probe shape is Grail's own: a dunder call on a
		class WITH arguments (``Base.__init__(self, a)'', ``dict.__setitem__(self,
		k, v)'', ``tuple.__getitem__(self, i)'') is Python's explicit unbound
		call and the UnboundMethod the loader answers is exactly right for it."
		((self @env0:isKindOf: Behavior) and: [anArray @env0:size = 0])
			ifTrue: [^ #'___noRecover___'].
		"Ask the TYPE before loading.  A dunder that reaches this hook is never
		a Python call -- CallAst keeps explicit dunder calls on load-then-call
		(___directCallSelector___, exclusion 8) -- so it is one of Grail's soft
		probes, and a probe that misses must stay cheap.  Loading raised and
		caught an AttributeError per miss, and that raise captures the frame's
		locals for ``Did you mean'' by walking out to the innermost Python
		frame: under pure-Python pickle every ``if self.current_frame:'' on a
		BytesIO paid it, and a dump ran 3.5x slower with the flag on (test_pickle
		went past the suite budget).  CPython looks special methods up on the
		type, not the instance, so a dunder the class carries neither as a
		compiled method (else there would have been no miss) nor as a class
		attribute is absent for this purpose."
		(self @env1:___classAttrDunder___: (entry @env0:at: 1)) == nil
			ifTrue: [^ #'___noRecover___'].
		attr := [self @env1:___pyAttrLoad___: (entry @env0:at: 1)]
			@env0:on: AttributeError do: [:ex | ex @env0:return: nil].
		"A dunder bound to a NON-callable (``__bool__ = None'', CPython's way of
		blocking a protocol) is the same protocol answer: the truthiness code's
		own TypeError text is the right one, not ``'NoneType' object is not
		callable''.  Only a callable value is a call to make."
		(attr == nil
			or: [((object @env0:___grailIsPatchableCallable___: attr)
				or: [attr @env0:isKindOf: Behavior]) not]) ifTrue: [^ #'___noRecover___']]
	ifFalse: [
		attr := self @env1:___pyAttrLoad___: (entry @env0:at: 1)].
	"anArray is handed straight through: BoundMethod coerces to an exact Array
	itself when it must perform, and a block or class takes any collection."
	^ attr @env1:value: anArray value: nil

]

{ #category : 'Grail-Self-Send Overrides' }
Object >> ___grailCallOverride___: anOverride name: aSymbol args: posArgs kw: kwOrNil [
	"Invoke what ___grailSelfSendOverrideFor___ found, binding self only for a
	class-level override -- an instance attribute is a plain function and
	CPython does not pass the instance to it.

	Nothing is marked, recorded or unwound here.  A ``wraps='' mock re-enters the
	method it wrapped, and what stops that becoming a loop is the selector PIN
	taken when the dispatcher was installed: the capture resolves to the
	``___grailOrig_'' shadow instead of back to this dispatcher.  See
	___grailInstallOneDispatcher___:definedIn:name:."

	| fn |
	fn := anOverride @env0:at: 2.
	"A class-level DESCRIPTOR (functools.singledispatchmethod, a user __get__
	class) binds through __get__ rather than by prepending self: CPython's
	``obj.m(x)'' is ``type(obj).__dict__['m'].__get__(obj, type(obj))(x)''.
	Functions, blocks and method wrappers keep the prepend (GRAIL_DIRECT_CALLS
	installs dispatchers for class-body descriptors too -- see
	___grailClassBodyStoreShadows___:name:)."
	((anOverride @env0:at: 1)
		and: [object @env0:___grailIsBindingDescriptor___: fn]) ifTrue: [
			^ ((fn @env1:___pyAttrLoad___: #'__get__')
				@env1:value: { self. self @env0:class } value: nil)
				@env1:value: posArgs @env0:asArray value: kwOrNil].
	^ (anOverride @env0:at: 1)
		ifTrue: [fn @env1:value: ({ self } @env0:, posArgs @env0:asArray) value: kwOrNil]
		ifFalse: [fn @env1:value: posArgs @env0:asArray value: kwOrNil]

]

{ #category : 'Grail-Method Defaults' }
Object >> ___grailClassDefault___: aSymbol [
	"This object's stored class-body default for one parameter, or nil when there
	is none -- the signal for the caller to fall back to the inline expression.
	Sent to ``self'' from inside the method, which is a Smalltalk pseudo-variable
	and so cannot be shadowed by a Python local; see ___grailClassDefaultPut___:.

	When the receiver is not an instance of the method's class -- UnboundMethod
	ran the method on a foreign or special first argument -- the walk from it
	misses, and the class UnboundMethod >> ___run:withDefaultOwner: recorded is
	tried instead (#1426)."

	| owner |
	^ (module @env0:___classDefaultOwnedBy: self at: aSymbol) ifNil: [
		owner := SessionTemps current at: #'GrailDefaultOwner' otherwise: nil.
		owner isNil
			ifTrue: [nil]
			ifFalse: [module @env0:___classDefaultOwnedBy: owner at: aSymbol]]

]

{ #category : 'Grail-Method Defaults' }
Object >> ___grailClassDefault___: aSymbol orClassBodyName: aName [
	"___grailClassDefault___:, and when no default was stored, the CLASS
	attribute aName -- for a default that is a bare PRIVATE class-body name
	(``def pop(self, key, default=__marker)'', which reads
	``_MutableMapping__marker'').

	The store is session-local and filled while the class body runs, and a
	DEPLOYED (canonical) class's body does not run again in a later session:
	the miss then fell back to the inline expression, which resolves the name
	as a module GLOBAL -- and a mangled private name never is one.  So
	collections.abc's MutableMapping.pop(key) raised ``NameError: name
	'_MutableMapping__marker' is not defined'' in every session after
	run_tests.sh's framework deploy (every Flask/Starlette request path).  The
	class still holds the attribute; reading it there is what the class-body
	scope the default was written in means.  nil when neither answers, so the
	caller still evaluates the expression and raises CPython's NameError."

	| v cls |
	v := self ___grailClassDefault___: aSymbol.
	v isNil ifFalse: [^ v].
	cls := (self isKindOf: Behavior) ifTrue: [self] ifFalse: [self class].
	^ [cls @env1:___pyAttrLoad___: aName]
		on: AbstractException do: [:e | e return: nil]

]

{ #category : 'Grail-Method Defaults' }
Object >> ___grailClassDefaultPut___: aSymbol compute: aBlock [
	"Store this CLASS's def-time value for one parameter default, evaluating it
	once.  Receiver is the class; forwards to module's side table.

	EXISTS ONLY TO BE A SAFE RECEIVER.  The generated code used to send
	``module ___classDefaultFor: ...'' with ``module'' spelled as a bare global,
	and a bare global in emitted code is whatever that scope binds -- ``module'' is
	an ordinary Python identifier, and jinja2's template runtime binds it, so the
	send went to nil and every Flask/Jinja2 test raised
	``UndefinedObject does not understand #___classDefaultOwnedBy:at:'' (27 errors).
	A class temp and ``self'' cannot be shadowed that way; the triple-underscore
	name cannot collide with a Python attribute either."

	^ module @env0:___classDefaultFor: self at: aSymbol compute: aBlock

]

{ #category : 'Grail-Self-Send Overrides' }
Object >> ___grailSelfSendOverrideFor___: aSymbol [
	"The override a self-send to aSymbol should run instead of this class's
	compiled method, as { bindSelf. callable }, or nil when there is none.

	TWO HOMES, IN CPYTHON'S ORDER.  An INSTANCE attribute wins, and is a plain
	function that gets NO self -- ``c.m = f'' then ``c.m()'' calls ``f()''.
	A CLASS attribute is a function found on the type, so it binds: ``C.m = f''
	then ``c.m()'' calls ``f(c)''.  ``bindSelf'' is which.

	NEVER ___pyAttrLoad___.  That would find this class's own compiled method
	when nothing is overridden, and calling it would re-enter the dispatcher
	that asked -- a hang, not a wrong answer.  Both probes here read STORED
	attributes only and cannot see a method.

	NO RE-ENTRANCE GUARD, and there was one.  ``patch.object(obj, ''m'',
	wraps=obj.m)'' used to recurse here -- the captured ``obj.m'' re-sends by
	selector and landed back on the running dispatcher -- and the first fix was
	to decline while a call for the same receiver and name was in flight.  That
	was wrong twice over: it read a SessionTemps registry on the FIRST LINE of
	every patched call, a probe measured at 118% of a whole Python call, and it
	silently ran the ORIGINAL for a genuinely recursive override, where CPython
	re-enters the override.  Pinning the selector at install time removes the
	re-entrance itself, so nothing has to be declined."

	| sym v cls ov |
	sym := aSymbol @env0:asSymbol.
	v := self @env0:dynamicInstVarAt: sym.
	"The receiver's OWN bound method for this very def is not an override.  A
	module caches one under each function's name (a bare ``f'' read hands it
	out), and an instance can be given its own (``c.m = c.m'', or a patch
	undone by restoring the captured attribute).  Calling it would re-send
	the selector into this dispatcher; skipping it runs the compiled def,
	which is what calling it means."
	((v @env0:isKindOf: BoundMethod)
		and: [(v @env0:receiver) == self
		and: [v @env0:selector ~~ nil
		and: [object @env0:___grailSelectorMatchesPythonName___: v @env0:selector name: sym]]])
			ifTrue: [v := nil].
	v == nil ifFalse: [^ { false. v }].
	cls := self @env0:class.
	"One overlay read for the whole chain -- see ___grailStoredClassAttrIn___."
	ov := SessionTemps @env0:current
		@env0:at: #'GrailClassAttrOverlay' otherwise: nil.
	[cls ~~ nil] @env0:whileTrue: [
		v := object @env0:___grailStoredClassAttrIn___: cls named: sym overlay: ov.
		v == nil ifFalse: [^ { true. v }].
		cls := cls @env0:superclass].
	^ nil

]

{ #category : 'Grail-Testing' }
Object >> ___isExactPyStr___ [
	"Is the receiver a Python ``str'' EXACTLY -- of type ``str'' itself, rather
	than an instance of a str SUBCLASS?

	It exists for the REFLECTED-OPERAND rule.  CPython gives the right-hand
	operand's dunder first refusal when its type is a SUBCLASS of the left
	operand's: ``'a' == X('a')'' with ``class X(str)'' runs ``X.__eq__'' first,
	and a user override there must win.  So str's binary dunders may settle a
	comparison directly against an EXACT str, and must punt (NotImplemented, or
	the binop fallback) for a subclass instance so the override gets its turn.

	Answering true is therefore a PROMISE that the receiver cannot carry a
	user-written __eq__ / __lt__ / __radd__.  PyStrSurrogate makes that promise
	-- ``type('\ud800') is str'' -- and AbstractPyStr, which exists precisely
	to BE a str subclass, does not."

	^ false

]

{ #category : 'Grail-Testing' }
Object >> ___isPyStr___ [
	"Is the receiver a Python ``str''?  False here; CharacterCollection and
	AbstractPyStr answer true.

	Defined in env 0, as its two overrides are, because the callers are
	Smalltalk guards.  Two consequences worth stating, both of which cost a
	broken suite to learn:

	  * Split the definitions across environments and the predicate answers
	    ``false'' for every string, since an env-1 lookup finds only this
	    one.  All three must live in env 0.
	  * From env-1 code, send it as ``@env0:___isPyStr___''.  A bare send
	    is an env-1 send and raises doesNotUnderstand.

	The point of asking this way rather than ``isKindOf: CharacterCollection''
	is that Grail's str is NOT one Smalltalk class and never was -- it is
	Unicode7 / Unicode16 / Unicode32 / String / Symbol, plus AbstractPyStr
	for StrEnum and ``class X(str)'', plus PyStrSurrogate for a str holding
	code points GemStone has no Character for.  A ``isKindOf:
	CharacterCollection'' test silently answers false for the last two, and
	the failure mode is a wrong answer rather than an error: the value is
	quietly treated as not-a-string and takes some other branch.

	Prefer this at every site that means ``is this a Python string''.  A site
	that genuinely means ``is this a Smalltalk CharacterCollection I am about
	to index or concatenate'' should keep isKindOf: and say so."

	^ false

]

{ #category : 'Grail-Transient Attrs' }
Object >> ___isTransientAttr___: aSymbol [
	"Is aSymbol one of the receiver's class-level __transient__ names (own or
	inherited)?  Asked only by the overrides ___grailInstallTransientAttrs___
	compiles, so only instances of such a class pay for it."

	^ (self class @env1:___pyTransientAttrs___) includesIdentical: aSymbol

]

{ #category : 'Grail-Testing' }
Object >> ___nonStringResultOf___: aDunder [
	"CPython's ``<dunder> returned non-string (type <T>)'' TypeError, naming
	the receiver's PYTHON type."

	| typeName |
	typeName := [(self @env1:__class__) @env1:__name__ asString]
		on: AbstractException do: [:ex | ex return: self class name asString].
	^ TypeError @env1:___signal___: aDunder , ' returned non-string (type ' , typeName , ')'

]

{ #category : 'Grail-Attribute Access' }
Object >> ___pyattrRecover___: aSelector args: anArray [
	"The doesNotUnderstand hooks' FIRST test (object, PythonInstance, module and
	the kernel-wrapper hooks that used to forward a miss to the wrapped value):
	an attribute-accessor send ``___pyattr_x___'' / ``___pyattr_x___:'' (#965's
	inferred-slot pair, #stage-3's read accessors) reaching a receiver whose
	class has no such accessor -- a kernel receiver (``e.args'', ``x.real''), a
	module or class reached dynamically, a method compiled for one class
	running on another (a class-body borrow, an MI copy).  Answers the read
	through ___pyAttrLoad___: and the 1-arg store through ___pyAttrStore___:put:,
	or #'___noRecover___' for any other selector.

	Cost is the point: this runs on EVERY env-1 miss, and the flag-on miss
	path for an uninferred receiver is DNU + this + the loader.  So: five
	Character compares on the Symbol itself (no asString copy), then the
	attribute name from a per-session memo (session-state slot 28,
	IdentityKeyValueDictionary selector -> Symbol) so the copy + intern happens
	once per selector.  Not flag-gated: the selectors only exist under the
	flags, and a spelled-out test is cheaper than a flag read."

	| sz name memo |
	sz := aSelector size.
	(sz > 13
		and: [(aSelector at: 4) == $p
		and: [(aSelector at: 5) == $y
		and: [(aSelector at: 10) == $_
		and: [(aSelector at: 1) == $_
		and: [(aSelector at: 6) == $a]]]]]) ifFalse: [^ #'___noRecover___'].
	memo := System __sessionStateAt: 28.
	memo == nil ifTrue: [
		memo := IdentityKeyValueDictionary new.
		System __sessionStateAt: 28 put: memo].
	name := memo at: aSelector otherwise: nil.
	name == nil ifTrue: [
		((aSelector copyFrom: 1 to: 10) = '___pyattr_') ifFalse: [^ #'___noRecover___'].
		name := ((aSelector at: sz) == $:)
			ifTrue: [(aSelector copyFrom: 11 to: sz - 4) asSymbol]
			ifFalse: [(aSelector copyFrom: 11 to: sz - 3) asSymbol].
		memo at: aSelector put: name].
	((aSelector at: sz) == $:) ifTrue: [
		anArray size = 1 ifFalse: [^ #'___noRecover___'].
		^ self @env1:___pyAttrStore___: name put: (anArray at: 1)].
	"The flag-off loader's order: the receiver's dynamic-instVar storage first
	(a stored value, a module global), the full loader on absent.  Only while
	the receiver's ___pyAttrLoad___: is object's own -- a class whose body
	defines __getattribute__ gets its own override at class build, and every
	read must reach it.  A special object (SmallInteger, nil) answers nil to the
	probe and falls through."
	((self class whichClassIncludesSelector: #'___pyAttrLoad___:' environmentId: 1) == Object)
		ifTrue: [ | v |
			v := self dynamicInstVarAt: name.
			v == nil ifFalse: [^ v]].
	^ self @env1:___pyAttrLoad___: name

]

{ #category : 'Grail-Attribute Access' }
Object >> ___pyClassNameForError___ [
	"The PYTHON name of a CLASS receiver for an error message -- ``int'', not
	``Integer''.

	The sibling ___pyDnuTypeName___ answers the type of an INSTANCE and is no
	use here: for a class receiver it answers 'type', which is correct for
	``iter(list)'' (``'type' object is not iterable'') and wrong for the two
	messages that name the class ITSELF:

	    type object 'int' has no attribute 'nosuchattr'
	    cannot set 'foo' attribute of immutable type 'int'

	Both used ``self name asString'', the SMALLTALK class name, so they read
	'Integer', 'Unicode7' and 'Float' -- names no Python programmer has seen.
	The classes whose two names happen to coincide (NoneType, frozenset,
	tuple) hid it, which is why it survived: whether the message was right
	depended on which built-in you picked.

	``__name__'' is the same source CPython prints from and Grail already
	answers it correctly for every built-in, so this is DERIVED rather than a
	second table to keep in step.  Wrapped, and falling back to the Smalltalk
	name, because it runs on the error path: a receiver carrying no env-1
	__name__ must still get its exception rather than a nested failure."

	^ [(self @env1:__name__) @env0:asString]
		on: Error do: [:ex | ex return: self @env0:name @env0:asString]

]

{ #category : 'Grail-Accessors' }
Object >> ___pyCodePoints___ [
	"The Unicode CODE POINTS of this Python str, one Integer per Python
	character -- nil when the receiver is not a str.

	This is the accessor that spans Grail's str representations.  A str is a
	CharacterCollection (Unicode7/16/32, String, Symbol), or an AbstractPyStr
	wrapping one, or a PyStrSurrogate holding code points no GemStone
	Character can represent.  Code points are the one view all three can
	answer, so a scanning loop written against THIS works for every str --
	where the usual ``(s at: j) codePoint'' works for only two of the three
	and raises on the last.

	Sits beside ___isPyStr___ in env 0 for the same reason: the callers are
	Smalltalk guards, and splitting the definitions across environments would
	make an env-1 lookup find only this one and answer nil for every string.
	From env-1 code, send it as ``@env0:___pyCodePoints___''."

	^ nil

]

{ #category : 'Grail-Attribute Access' }
Object >> ___pyDnuTypeName___ [
	"The PYTHON type name to put in a TypeError raised from the DNU handler.

	``self class name asString'' -- what these messages used before -- leaks
	the Smalltalk class that happens to back a built-in, so ``x[0] = 1'' on a
	float read ``'SmallDouble' object does not support item assignment'' and
	on an int ``'SmallInteger' ...''.  ``type(x).__name__'' is the same source
	CPython prints from and Grail already answers it correctly for every
	built-in (int / float / bool / complex / NoneType / object / set /
	frozenset / ellipsis / generator / str / bytes / range / list / tuple /
	dict / slice) as well as for user classes, so this is DERIVED, not a
	second table to keep in step with the first.

	env 0, because the DNU handler is compiled in env 0.  Wrapped, because it
	runs on the error path: a receiver whose class carries no env-1 __name__
	must still get its TypeError, not a nested failure."

	^ [self @env1:___pyTypeNameForError___]
		on: Error do: [:ex | ex return: self class name asString]

]

{ #category : 'Grail-Attribute Access' }
Object >> ___pyItemDeletionMessage___ [
	"CPython's refusal for ``del x[i]'', which has TWO wordings and picks
	between them by C slot rather than by anything visible from Python:
	PyObject_DelItem sends an integer key to PySequence_DelItem whenever the
	type has a tp_as_sequence table at all (``doesn't support item
	deletion''), and only falls through to ``does not support item deletion''
	for a type with no sequence table -- int, float, bool, complex, NoneType,
	object, type, ellipsis, generator.  ``tuple'', ``str'', ``bytes'',
	``range'', ``set'', ``frozenset'' and EVERY Python-defined class take the
	first wording (CPython allocates a sequence table for every heap type).

	Read here as: a PythonInstance (Grail's heap type), or a built-in that
	REALLY owns __getitem__ or __contains__.  Ownership, via
	___hasProtocolForCall___:, because the raising fallbacks answer a plain
	probe for everything.  Derived from the receiver rather than enumerated,
	so a type added later gets the right wording without editing a list.

	Residual: the three places Grail deliberately gives an object a
	__getitem__ CPython does not (a module, a class through Metaclass3, a
	BoundMethod) take the ``doesn't'' wording where CPython says ``does
	not''.  That follows from the divergence, not from this rule."

	| seqLike |
	seqLike := (self isKindOf: PythonInstance)
		or: [[(self @env1:___hasProtocolForCall___: '__getitem__')
			or: [self @env1:___hasProtocolForCall___: '__contains__']]
				on: Error do: [:ex | ex return: false]].
	^ '''', self ___pyDnuTypeName___,
		(seqLike
			ifTrue: [''' object doesn''t support item deletion']
			ifFalse: [''' object does not support item deletion'])

]

{ #category : 'Grail-Callable' }
Object >> ___pyNamed___: aString [
	"No-op fallback for the nested-def name stamp emitted by
	FunctionDefAst (``<block> @env0:___pyNamed___: 'name''').  ExecBlock
	overrides this to record ``__name__'' in its side-table; for any
	other value a nested def can evaluate to (e.g. a generator wrapper)
	the name simply isn't recorded.  Always returns self so the stamp is
	transparent in the assignment / decorator pipeline."

	^ self

]

{ #category : 'Grail-Accessors' }
Object >> ___pyPlainStr___ [
	"This Python str as a CharacterCollection the GemStone kernel can index,
	search and concatenate -- nil when no CharacterCollection can hold its
	code points (it contains a lone surrogate), and nil when the receiver is
	not a str at all.

	The companion to ___pyCodePoints___, and the cheaper question.  Most
	string code wants to hand its argument straight to a kernel primitive
	(findString:startingAt:, beginsWith:, copyReplaceAll:with:), and those
	raise an UNCATCHABLE ArgumentTypeError on anything else -- which no Python
	``except'' can see -- so the call site has to ask FIRST.  A nil answer for
	a str is not an error condition: it is the information that a needle
	holding a surrogate can never occur in a surrogate-free haystack, which is
	usually the whole answer the caller needed."

	^ nil

]

{ #category : 'Grail-Iteration' }
Object >> ___pyStarToArray___ [
	"Materialize the receiver — the source of a ``*''-unpack in a tuple /
	list literal or in call arguments — into a Smalltalk Array.  ``list''
	(OrderedCollection) and ``tuple'' (Array) are already
	SequenceableCollections and convert directly; any OTHER Python
	iterable (an iterator such as ``reversed(x)'' or ``dict.keys()'' ->
	list_iterator, a generator, map, range, …) is materialized through
	``list''s __iter__/__next__ constructor.  Replaces a bare ``asArray''
	in the splat codegen, which a Python iterator does not understand —
	the crash flask's ``preprocess_request'' hit via
	``(None, *reversed(request.blueprints))''.

	A str is a SequenceableCollection too, but its asArray is an Array of
	Smalltalk Characters -- ``(*'ab',)'' answered two Character objects, where
	iterating a str yields one-character strs.  It takes the iteration path."

	((self isKindOf: SequenceableCollection)
		and: [(self isKindOf: CharacterCollection) not
		and: [(self @env1:___iterIsPythonDefined___) not]]) ifTrue: [^ self asArray].
	"CPython's own message for a splat of a non-iterable -- ``[*42]'' and
	``partial(f, *42)'' both say ``Value after * must be an iterable, not
	int'' -- rather than list()'s ``'int' object is not iterable''.  Decided
	by the protocol probe iter() itself uses (builtins>>___pyIter___:), so the
	same objects count as iterable here as there."
	((self @env1:___hasProtocolForCall___: '__iter__')
		or: [self @env1:___hasProtocolForCall___: '__getitem__']) ifFalse: [
			^ TypeError @env1:___signal___: 'Value after * must be an iterable, not '
				, (self @env1:___pyTypeNameForError___) asString].
	^ (list @env1:__new__: self) asArray

]

{ #category : 'Grail-Testing' }
Object >> ___reprResult___ [
	"Sent to what a __repr__ answered, at every site that takes a repr:
	CPython's PyObject_Repr refuses anything but a str (a subclass is fine)
	with this TypeError.  Grail handed the value on, so ``repr(x)'' could be
	an int, and a list holding such an x failed with a Smalltalk
	doesNotUnderstand: instead.

	A UNARY send to the RESULT, deliberately.  Several of the sites are
	container reprs on the recursive-repr path (test_xml_etree's
	test_recursive_repr, test_reprlib, test_copy), where a wider frame moves
	the VM's stack trip and can surface its re-trip defect -- a str.__mod__
	temp once did.  ``x __repr__ @env0:___reprResult___'' adds no temp and
	pushes nothing before the recursive call.

	Env 0 beside ___isPyStr___, for the same reason: the overrides on
	CharacterCollection and AbstractPyStr must be found by the same lookup."

	^ self ___nonStringResultOf___: '__repr__'

]

{ #category : 'Grail-Transient Attrs' }
Object >> ___runInstanceSessionInitOnce___ [
	"Run the receiver's ``__session_init__'' if it is committed, its class
	defines one, and it has not run for this object in this session.  Marked
	BEFORE the call, so a hook that reads an attribute it has not yet set
	gets AttributeError rather than recursing.  Answers whether it ran."

	| done |
	self isCommitted ifFalse: [^ false].
	(self class whichClassIncludesSelector: #'__session_init__' environmentId: 1) isNil
		ifTrue: [^ false].
	done := SessionTemps current at: #'GrailTransientInitDone' otherwise: nil.
	done isNil ifTrue: [
		done := IdentitySet new.
		SessionTemps current at: #'GrailTransientInitDone' put: done].
	(done includes: self) ifTrue: [^ false].
	done add: self.
	self perform: #'__session_init__' env: 1.
	^ true

]

{ #category : 'Grail-Testing' }
Object >> ___strResult___ [
	"Sent to what a __str__ answered, at every site that takes str(x):
	CPython's PyObject_Str refuses anything but a str (a subclass is fine).
	Grail handed the value on, so ``str(x)'' could be an int, and ``%s'' and
	str.format rendered a None as its Smalltalk printString, 'aNoneType'.
	The same unary-on-the-result shape as ___reprResult___, for the same
	reason.

	The message names __str__ even when the value came from a __repr__ that
	object.__str__ fell back to: CPython's object.__str__ calls the repr
	SLOT, so the only check is PyObject_Str's."

	^ self ___nonStringResultOf___: '__str__'

]

{ #category : 'Grail-Transient Attrs' }
Object >> ___transientAttrAt___: aSymbol [
	"The session value of transient attribute aSymbol, or nil (unset).  The
	first miss on a COMMITTED object in a session runs its class's
	``__session_init__'' once (D5 for an instance), then reads again: a
	committed object faulted into a new session rebuilds its session tier on
	first use."

	| d v |
	d := self ___transientAttrsCreate: false.
	d isNil ifFalse: [
		v := d at: aSymbol otherwise: nil.
		v isNil ifFalse: [^ v]].
	self ___runInstanceSessionInitOnce___ ifFalse: [^ nil].
	d := self ___transientAttrsCreate: false.
	^ d isNil ifTrue: [nil] ifFalse: [d at: aSymbol otherwise: nil]

]

{ #category : 'Grail-Transient Attrs' }
Object >> ___transientAttrAt___: aSymbol put: aValue [
	"Store (or, for nil, unbind) transient attribute aSymbol for this session."

	| d |
	(aValue == nil or: [aValue == _remoteNil])
		ifTrue: [
			d := self ___transientAttrsCreate: false.
			d isNil ifFalse: [d removeKey: aSymbol ifAbsent: []]]
		ifFalse: [(self ___transientAttrsCreate: true) at: aSymbol put: aValue].
	^ aValue

]

{ #category : 'Grail-Transient Attrs' }
Object >> ___transientAttrPairs___ [
	"The bound transient attributes as a flat name/value Array, the shape
	dynamicInstVarPairs answers."

	| d out |
	d := self ___transientAttrsCreate: false.
	d isNil ifTrue: [^ #()].
	out := OrderedCollection new.
	d keysAndValuesDo: [:k :v | out add: k; add: v].
	^ out asArray

]

{ #category : 'Grail-Transient Attrs' }
Object >> ___transientAttrsCreate: aBoolean [
	"This object's class-level ``__transient__'' attributes, name -> value,
	for THIS SESSION (docs/App_Namespaces_Design.md §6.3), or nil when it has
	none and aBoolean is false.  SessionTemps, keyed by the object and held
	STRONGLY for the session's life: a DbTransient slot would revert to nil
	mid-session once nothing else held the object, and a live socket must not
	vanish.  Never committed, untouched by an abort, empty in a new session."

	| reg d |
	reg := SessionTemps current at: #'GrailTransientAttrs' otherwise: nil.
	reg isNil ifTrue: [
		aBoolean ifFalse: [^ nil].
		reg := IdentityKeyValueDictionary new.
		SessionTemps current at: #'GrailTransientAttrs' put: reg].
	d := reg at: self otherwise: nil.
	(d isNil and: [aBoolean]) ifTrue: [
		d := SymbolKeyValueDictionary new.
		reg at: self put: d].
	^ d

]

{ #category : 'Grail-Attribute Access' }
Object >> ___tryBinaryDunderDNU___: aSelector args: anArray [
	"When aSelector is a missing BINARY-OPERATOR dunder, run the Python
	protocol tail (reflected dunder on the operand, else catchable
	TypeError) and return its result; otherwise return the
	#___noBinOp___ sentinel.  Called from BOTH doesNotUnderstand:
	overrides -- Object's (env-1 miss on any receiver) and
	PythonInstance's (which would otherwise misread ``__sub__: other''
	as an attribute-setter and silently store the operand).  Handled at
	dispatch-failure time rather than as object-level default methods,
	which would shadow DNU-based magic like IntEnum member arithmetic."

	| binOp vaSel |
	binOp := nil.
	aSelector == #'__add__:' ifTrue: [binOp := { '+'. #'__radd__:' }].
	aSelector == #'__sub__:' ifTrue: [binOp := { '-'. #'__rsub__:' }].
	aSelector == #'__mul__:' ifTrue: [binOp := { '*'. #'__rmul__:' }].
	aSelector == #'__truediv__:' ifTrue: [binOp := { '/'. #'__rtruediv__:' }].
	aSelector == #'__floordiv__:' ifTrue: [binOp := { '//'. #'__rfloordiv__:' }].
	aSelector == #'__divmod__:' ifTrue: [binOp := { 'divmod()'. #'__rdivmod__:' }].
	aSelector == #'__mod__:' ifTrue: [binOp := { '%'. #'__rmod__:' }].
	aSelector == #'__pow__:' ifTrue: [binOp := { '**'. #'__rpow__:' }].
	aSelector == #'__lshift__:' ifTrue: [binOp := { '<<'. #'__rlshift__:' }].
	aSelector == #'__rshift__:' ifTrue: [binOp := { '>>'. #'__rrshift__:' }].
	aSelector == #'__and__:' ifTrue: [binOp := { '&'. #'__rand__:' }].
	aSelector == #'__or__:' ifTrue: [binOp := { '|'. #'__ror__:' }].
	aSelector == #'__xor__:' ifTrue: [binOp := { '^'. #'__rxor__:' }].
	aSelector == #'__matmul__:' ifTrue: [binOp := { '@'. #'__rmatmul__:' }].
	binOp == nil ifTrue: [^ #'___noBinOp___'].
	"A dunder compiled VARARGS-ONLY (``def __pow__(a, b, modulo=None)``
	in vendored fractions.py) has no fixed ``__pow__:`` selector, so the
	send landed here -- dispatch the ``___pow__:kw:`` form before
	running the fallback protocol."
	vaSel := ('_' , (aSelector asString copyFrom: 1
		to: aSelector asString size - 1) , ':kw:') asSymbol.
	(self @env1:___respondsTo___: vaSel)
		ifTrue: [^ self perform: vaSel env: 1
			withArguments: { anArray. nil }].
	^ self @env1:___binOpFallback___: (anArray at: 1)
		op: (binOp at: 1) reflected: (binOp at: 2)

]

{ #category : 'Grail-Attribute Access' }
Object >> ___tryClassMethodDNU___: aSelector args: anArray [
	"@classmethod reached through an INSTANCE.

	Codegen emits a direct instance-side send for ``self.cm(args)'',
	but ClassDefAst compiles @classmethod/@staticmethod defs onto the
	METACLASS (category ``Grail-Class Methods'').  Forward with the
	class as the receiver, matching Python's classmethod-via-instance
	binding.

	PythonInstance carries its own copy of this probe because there it
	must run BEFORE that class's attribute-setter interpretation (a
	1-arg ``cm:'' would otherwise be stored as an instance attribute).
	This one serves every OTHER receiver -- in particular subclasses of
	kernel classes (str/bytes/tuple/list/dict), which are NOT
	PythonInstances and so never reach that copy.  markupsafe's
	``Markup.__add__'' calling ``self.escape(value)'' is the motivating
	case.

	Both the plain selector and the varargs form (``_cm:kw:'', emitted
	when the def has *args/**kwargs or defaults) are probed.  The
	category gate keeps synthesized class-attribute accessors
	(``Grail-Class Attrs'') and ordinary Smalltalk class-side methods
	out.  Answers #'___noClassMethod___' when nothing matches."

	| meta owner s |
	meta := self class class.
	owner := meta whichClassIncludesSelector: aSelector environmentId: 1.
	(owner notNil and: [
		(owner categoryOfSelector: aSelector environmentId: 1)
			= #'Grail-Class Methods']) ifTrue: [
		^ self class perform: aSelector env: 1
			withArguments: anArray asArray].
	s := aSelector asString.
	(s size > 0 and: [s last = $:]) ifTrue: [
		| colonIdx baseName varargsSel |
		colonIdx := s indexOf: $:.
		baseName := s copyFrom: 1 to: colonIdx - 1.
		varargsSel := ('_' , baseName , ':kw:') asSymbol.
		owner := meta whichClassIncludesSelector: varargsSel environmentId: 1.
		(owner notNil and: [
			(owner categoryOfSelector: varargsSel environmentId: 1)
				= #'Grail-Class Methods']) ifTrue: [
			| wrapped |
			wrapped := Array new: 2.
			wrapped at: 1 put: anArray asArray.
			wrapped at: 2 put: nil.
			^ self class perform: varargsSel env: 1 withArguments: wrapped]].
	^ #'___noClassMethod___'

]

{ #category : 'Grail-Attribute Access' }
Object >> ___tryMetaclassMethodDNU___: aSelector args: anArray [
	"A metaclass method reached by a DIRECT SEND rather than an attribute load.

	``ABCMeta.__instancecheck__'' ends in ``return cls.__subclasscheck__(...)'',
	and inside a method ``cls'' IS the receiver, so codegen takes the self-send
	fast path and emits a plain ``__subclasscheck__:'' send.  That dispatches on
	the USING class, where the sibling metaclass method is not -- Grail records a
	metaclass rather than making the class an instance of it, so the two live in
	unrelated chains.  ___pyAttrLoad___'s metaclass consult never runs, because
	no attribute was loaded.

	Catching it here rather than teaching the fast path to sit this one out keeps
	the cost where it belongs: on the miss, which is the only case that needs it.
	Answers #'___noMetaMethod___' when nothing matches, so a genuine unknown send
	still raises MNU.

	Only a Behavior receiver qualifies.  An INSTANCE of a class whose metaclass
	defines the selector must not reach it -- in Python a metaclass method is not
	part of the instance protocol."

	| s base handle isVarargs |
	(self isKindOf: Behavior) ifFalse: [^ #'___noMetaMethod___'].
	self @env1:___grailMetaclass___ == nil ifTrue: [^ #'___noMetaMethod___'].
	s := aSelector asString.
	base := (s includesValue: $:)
		ifTrue: [s copyFrom: 1 to: (s indexOf: $:) - 1]
		ifFalse: [s].
	"The varargs form arrives as ``_name:kw:'' carrying {positional. kwargs}
	rather than the arguments themselves; its Python name drops the leading
	underscore this convention added."
	isVarargs := (s endsWith: ':kw:')
		and: [base size > 1 and: [(base at: 1) == $_]].
	isVarargs ifTrue: [base := base copyFrom: 2 to: base size].
	handle := self @env1:___metaclassMethodFor___: base asSymbol.
	handle == nil ifTrue: [^ #'___noMetaMethod___'].
	isVarargs ifTrue: [
		^ handle @env1:value: (anArray at: 1) value: (anArray at: 2)].
	^ handle @env1:value: anArray asArray value: nil

]

{ #category : 'Grail-Attribute Access' }
Object >> ___unaryOperandErrorMessage___: aSelector [
	"CPython's refusal for a unary operator applied to a type that has no
	such dunder; nil when aSelector is not one of the four.

	TWO WORDINGS, and the difference is not cosmetic: three of them name
	the OPERATOR GLYPH and abs() names the FUNCTION, because that is what
	the reader typed.

	    -x       bad operand type for unary -: 'X'
	    abs(x)   bad operand type for abs(): 'X'

	The type name comes from ___pyDnuTypeName___ rather than ``self class
	name asString'', which is what the caller used to build and which
	LEAKED THE SMALLTALK CLASS: ``-'ab''' read ``bad operand type for
	unary -: 'Unicode7''', a list read 'OrderedCollection', a dict
	'PyDict' and object() 'Object'.  Four of nine receiver kinds named a
	class no Python programmer has heard of -- the exact bug
	___pyDnuTypeName___ was written for, in a message that had not been
	converted."

	| glyph |
	glyph := nil.
	aSelector == #'__neg__' ifTrue: [glyph := '-'].
	aSelector == #'__pos__' ifTrue: [glyph := '+'].
	aSelector == #'__invert__' ifTrue: [glyph := '~'].
	glyph == nil ifFalse: [
		^ 'bad operand type for unary ' , glyph , ': ''' ,
			self ___pyDnuTypeName___ , ''''].
	aSelector == #'__abs__' ifTrue: [
		^ 'bad operand type for abs(): ''' , self ___pyDnuTypeName___ , ''''].
	^ nil

]

{ #category : 'Grail-Attribute Access' }
Object >> doesNotUnderstand: aSelector args: anArray envId: envId [
	"Bound-method-via-attribute-load fallback.

	In Python, ``obj.method`` (without calling) yields a bound method
	that can be stored, passed around, or later invoked.  When ``attr``
	names a method that takes arguments (e.g. OrderedCollection >>
	append:), a bare unary send has no matching selector.  Rather than
	emit an explicit BoundMethod wrapper at every attribute load (most of
	which DO refer to instVar/property values), intercept at DNU time and
	synthesize the BoundMethod when the send fails AND the class has a
	same-named callable selector (``attr:``, ``attr:_:`` etc.).
	All other unknown sends fall through to super.

	WHAT ACTUALLY ARRIVES HERE IS NARROWER THAN THAT SUGGESTS, and the
	difference cost a real defect (see the 0-arg branch below).  This
	comment used to say ``our codegen emits attribute reads as `obj attr`
	(a unary message send)'', which has not been true for some time:
	AttributeAst >> ___emitSmalltalkOn___ emits ``value
	@env1:___pyAttrLoad___: #attr'', and THAT helper probes every arity
	variant -- the varargs ``_attr:kw:'' included -- and makes its own
	BoundMethod.  A plain ``k.zero'' answers a bound method even though a
	real 0-arg ``zero'' exists, which a bare send would have called.

	So a bare send reaching this DNU is a CALL, not a method read: an
	operator, or an explicit ``k.m()''.  Reason about new branches here
	from that, not from the sentence above."

	| s has cls binOp clsMeth metaMeth varargsSel |
	envId = 1 ifFalse: [
     ^ MessageNotUnderstood new
         receiver: self selector: aSelector args: anArray envId: envId ; 
         signal ].
	[:rec | rec == #'___noRecover___' ifFalse: [^ rec]] value: (self ___pyattrRecover___: aSelector args: anArray).
	s := aSelector asString.
	cls := self class.
	"Whether the class's OWN env-1 methods hold a selector.  Asked of the class,
	not of ``cls methodDictForEnv: 1'': that builds a merged COPY of the whole
	method dictionary, and this handler runs on every env-1 miss -- every
	``if x:'' on an object without __bool__ took it, and in an ElementTree
	parse the copies were a fifth of the time (#1214).  A String probe also
	interns nothing: includesSelector: looks the Symbol up, never creates it."
	has := [:sel | cls includesSelector: sel environmentId: 1].
	"A missing BINARY-OPERATOR dunder takes the Python protocol tail:
	reflected dunder on the operand, else catchable TypeError.  Handled
	HERE at dispatch-failure time (not as object-level default methods,
	which would shadow DNU-based magic like IntEnum member arithmetic --
	``Color.RED + 1'' resolves through this very handler's
	BoundMethod/varargs machinery)."
	binOp := self ___tryBinaryDunderDNU___: aSelector args: anArray.
	binOp == #'___noBinOp___' ifFalse: [^ binOp].
	"A SELF-SEND TO A METHOD THE CLASS HOLDS AS AN ATTRIBUTE.  A class a
	metaclass BUILT -- typing's NamedTupleMeta returns the class
	collections.namedtuple made, and setattr()s the body's methods onto it --
	holds them as class attributes, not compiled methods.  Those methods were
	compiled on the class statement's own class, so a sibling call inside one
	(jinja2's ``Token.test_any'' calls ``self.test(expr)'') is a plain
	Smalltalk self-send, and the namedtuple class does not understand it.
	CPython finds the function in the class's __dict__; so does this, by
	loading the attribute (which binds it) and calling that.

	A CLASS receiver takes the same route, looking in its OWN dict rather than
	its metaclass's: a @classmethod moved that way calls its siblings as
	``cls.three(x, 2, 3)'', a send to the namedtuple class, whose metaclass
	compiled nothing of the sort -- an uncatchable MessageNotUnderstood
	(#1455; pytest's ParameterSet is a NamedTuple whose classmethods call each
	other).  The compiled-name test below still asks ``cls'', which for a
	class is its metaclass, where a class's own @classmethods live.

	A class also takes the ZERO-argument form, ``cls.zero()'', which an
	instance does not: unary sends to instances are how Grail's own code
	probes for an optional protocol, and a held attribute answering one would
	change what the probe sees.  Names starting ``__'' -- dunders and Grail's
	``___'' internals -- stay out for a class too."
	(((s @env0:indexOf: $:) @env0:> 0)
		or: [(self isKindOf: Behavior)
			and: [s @env0:size @env0:< 2 or: [(s @env0:copyFrom: 1 to: 2) @env0:~= '__']]]) ifTrue: [
		| varargs pyName held |
		varargs := (s @env0:size @env0:> 4) and: [(s @env0:endsWith: ':kw:')
			and: [(s @env0:at: 1) == $_]].
		pyName := varargs
			ifTrue: [s @env0:copyFrom: 2 to: s @env0:size @env0:- 4]
			ifFalse: [(s @env0:indexOf: $:) @env0:= 0
				ifTrue: [s]
				ifFalse: [s @env0:copyFrom: 1 to: (s @env0:indexOf: $:) @env0:- 1]].
		"Only for a name the class does NOT compile in any arity.  A class that
		defines ``register'' and was sent the wrong arity of it must still get
		the ordinary refusal: the attribute read finds its own method, whose
		varargs forwarder performs the missing fixed selector again -- which
		recursed argparse to the stack limit."
		held := ((importlib @env0:___pythonNameFamilyOf___: aSelector)
				@env0:anySatisfy: [:sel |
					(cls @env0:whichClassIncludesSelector: sel environmentId: 1) @env0:notNil])
			ifTrue: [nil]
			ifFalse: [[ | root |
					root := (self isKindOf: Behavior) ifTrue: [self] ifFalse: [cls].
					"BOTH HOMES of a class attribute.  A runtime store on a
					CANONICAL class -- every class of an imported module, which
					is what typing.NamedTuple's setattr() runs against -- lands
					in the session overlay, not the committed holder
					___classChainAttrLookup___: reads.  Only a __main__ class
					kept it in the holder, so this branch worked in a script and
					not in the module that imported it (#1455)."
					(root @env1:___classChainAttrLookup___: pyName @env0:asSymbol)
						@env0:ifNil: [self @env1:___classAttrOverlayLookup___: root
							name: pyName @env0:asSymbol]]
				@env0:on: AbstractException do: [:ex | ex @env0:return: nil]].
		held @env0:notNil ifTrue: [ | fn |
			fn := self @env1:___pyAttrLoad___: pyName @env0:asSymbol.
			^ varargs
				ifTrue: [fn @env1:value: (anArray @env0:at: 1) value: (anArray @env0:at: 2)]
				ifFalse: [fn @env1:value: anArray value: nil]]].
	"A METACLASS METHOD reached as a DIRECT SEND on the class.  Inside a compiled
	method body ``cls.__subclasscheck__(c)'' emits the send __subclasscheck__:
	rather than an attribute load, so the metaclass consult in ___pyAttrLoad___:
	never runs -- and the class's own Smalltalk metaclass, a Metaclass3, does not
	understand it.  That is how a metaclass calling its own sibling hook died
	(test_typechecks's ABC.__instancecheck__ calls cls.__subclasscheck__).

	Invoked with the class prepended as the cls parameter, and dispatched off
	the recorded metaclass because the class is not a Smalltalk instance of it."
	(self isKindOf: Behavior) ifTrue: [ | meta base tbl |
		"The table is read DIRECTLY: this runs in the DNU path for EVERY class
		that fails a send, including kernel classes whose metaclass chain does
		not reach object, where the env-1 ___grailMetaclass___ send is itself a
		MessageNotUnderstood."
		tbl := SessionTemps @env0:current
			@env0:at: #'GrailClassMetaclass' otherwise: nil.
		meta := tbl == nil ifTrue: [nil] ifFalse: [tbl @env0:at: self otherwise: nil].
		(meta @env0:notNil
			and: [(meta @env0:whichClassIncludesSelector: aSelector environmentId: 1)
				@env0:notNil]) ifTrue: [
			base := (s @env0:includes: $:)
				ifTrue: [s @env0:copyFrom: 1 to: (s @env0:indexOf: $:) @env0:- 1]
				ifFalse: [s].
			"This method compiles in env 0, so the UnboundMethod protocol -- which
			is env 1 -- needs explicit annotations."
			^ (UnboundMethod @env1:definingClass: meta selector: base @env0:asSymbol)
				@env1:value: (Array @env0:with: self) @env0:, anArray value: nil]].
	"__init_subclass__ is an IMPLICIT CLASSMETHOD (PEP 487): its method
	compiles INSTANCE-side and running it against a CLASS receiver is the
	established convention -- the class-creation runner performMethod:s it
	exactly that way.  But a fixed-arity hook (``def __init_subclass__(cls,
	x)'') gets a varargs forwarder that re-dispatches to its fixed selector
	with a VIRTUAL self-send, and when self is a class the lookup runs the
	METACLASS chain and arrives here: ``a Metaclass3 does not understand
	#__init_subclass__:'', uncatchable, at every ``class C(Base, x=1)'' whose
	hook declares a required parameter.  Finish the dispatch the way it was
	started -- non-virtually, against the class's own instance side.  Scoped
	to the one selector family whose instance-side methods legitimately take
	class receivers; anything else keeps failing exactly as before."
	(self isKindOf: Behavior) ifTrue: [ | iscBase iscOwner iscMeth |
		iscBase := (s @env0:includes: $:)
			ifTrue: [s @env0:copyFrom: 1 to: (s @env0:indexOf: $:) @env0:- 1]
			ifFalse: [s].
		iscBase @env0:= '__init_subclass__' ifTrue: [
			iscOwner := self @env0:whichClassIncludesSelector: aSelector
				environmentId: 1.
			iscOwner == nil ifFalse: [
				iscMeth := iscOwner @env0:compiledMethodAt: aSelector
					environmentId: 1.
				iscMeth == nil ifFalse: [
					anArray @env0:size @env0:= 0 ifTrue: [
						^ self @env0:performMethod: iscMeth].
					anArray @env0:size @env0:= 1 ifTrue: [
						^ self @env0:with: (anArray @env0:at: 1)
							performMethod: iscMeth].
					anArray @env0:size @env0:= 2 ifTrue: [
						^ self @env0:with: (anArray @env0:at: 1)
							with: (anArray @env0:at: 2) performMethod: iscMeth].
					anArray @env0:size @env0:= 3 ifTrue: [
						^ self @env0:with: (anArray @env0:at: 1)
							with: (anArray @env0:at: 2)
							with: (anArray @env0:at: 3) performMethod: iscMeth].
					anArray @env0:size @env0:= 4 ifTrue: [
						^ self @env0:with: (anArray @env0:at: 1)
							with: (anArray @env0:at: 2)
							with: (anArray @env0:at: 3)
							with: (anArray @env0:at: 4) performMethod: iscMeth]]]]].
	"A missing ITEM dunder -- ``x in y'', ``y[i]'', ``y[i] = v'', ``del y[i]''
	-- raises CPython's catchable TypeError instead of an UNCATCHABLE env-1
	MessageNotUnderstood that no Python ``except'' can see.

	``__getitem__:'' was for a long time deliberately left OUT of this list,
	on the ground that ``__len__ / __iter__ / __getitem__ double as soft-miss
	PROBES all over Grail's own machinery''.  Two things have since made that
	true of __len__ and __iter__ only.  (1) __iter__ acquired a REAL
	object-level fallback of its own (``object >> __iter__'' below), so the
	no-blanket rule already does not describe it.  (2) Every ownership probe
	Grail has -- ___protocolOwnedBy___:name:, ___matchDefinesOwnSelector___:,
	___hasProtocolForCall___: -- was written to look BELOW the raising
	fallback level precisely so a fallback __getitem__: cannot be mistaken
	for a real one; their comments already describe the blanket as if it
	existed.  What stood in its place was a hard-coded list of types someone
	had to remember to extend: int (Int.gs), NoneType (NoneType.gs) and
	PythonInstance each grew a private copy, while float, bool, complex,
	object, set, frozenset and ellipsis were never given one and killed the
	process on ``x[0]''.

	A DNU INTERCEPT rather than a real ``object >> __getitem__:'': method
	lookup is left untouched.  ``whichClassIncludesSelector:'' keeps answering
	nil, nothing that probes for ownership has to learn a new exclusion, and
	``hasattr(x, '__getitem__')'' still answers False for the receivers this
	covers -- object(), a set, a frozenset -- where a real object-level method
	would have made it True for every object alive, which is not what CPython
	reports.  (float / bool / int / str already answer True for an unrelated
	reason: an instance attribute load reaches the CLASS-side __getitem__:
	Subscript.gs installs on Float / Boolean / Integer / CharacterCollection.
	That leak predates this and is untouched by it.)  The intercept fires only
	where dispatch has ALREADY failed.

	__len__ is still NOT intercepted -- truthiness checks on user instances
	and PyDateTime formatting soft-miss it -- so len(None)-style calls remain
	a documented residual.  PythonInstance is excluded throughout because it
	carries real methods for all four selectors, so an intercept here could
	never fire for one.  (The exclusion was originally written because that
	class's own DNU read an unknown one-argument keyword send as an attribute
	STORE.  It raises AttributeError now -- see PythonInstance >>
	doesNotUnderstand:args:envId: -- so only the first reason still applies.)"
	(self isKindOf: PythonInstance) ifFalse: [
		aSelector == #'__contains__:' ifTrue: [
			TypeError @env1:___signal___: ('argument of type ''',
				self ___pyDnuTypeName___,
				''' is not iterable')].
		aSelector == #'__getitem__:' ifTrue: [
			TypeError @env1:___signal___: ('''',
				self ___pyDnuTypeName___,
				''' object is not subscriptable')].
		aSelector == #'__setitem__:_:' ifTrue: [
			TypeError @env1:___signal___: ('''',
				self ___pyDnuTypeName___,
				''' object does not support item assignment')].
		aSelector == #'__delitem__:' ifTrue: [
			TypeError @env1:___signal___: self ___pyItemDeletionMessage___]].
	"Missing UNARY operator dunders (``~None'', ``-None'', ``+None'',
	``abs(None)'') raise CPython's catchable TypeError.

	A kernel-backed receiver can be refused HERE, before any resolution is
	attempted, because it has no Python class body that could still supply
	the dunder.  A PythonInstance can not, so it is refused at the END of
	the 0-arg path instead, once the varargs, classmethod and metaclass
	probes have all missed -- see the matching send down there.  Splitting
	it that way is what lets both kinds reach the same TypeError without
	this early exit shadowing a method a user class really does define."
	(self isKindOf: PythonInstance) ifFalse: [
		(self ___unaryOperandErrorMessage___: aSelector) ifNotNil: [:___um |
			TypeError @env1:___signal___: ___um]].
	"GRAIL_DIRECT_CALLS: a direct ``recv foo: a'' / ``recv foo'' that missed is a
	Python CALL -- load the attribute and call it; a missing name raises the
	loader's AttributeError, a missing dunder declines and the tails below run
	as before the flag existed (see ___directCallRecover___:args:).  Placed
	after the two Behavior-only branches, which serve direct sends codegen
	already emitted before this flag, and before every remaining probe, so a
	stored callable on a kernel-backed or foreign receiver pays one primitive
	flag read, the memoised name lookup, the load and the call."
	((System @env0:__sessionStateAt: 25) @env0:ifNil: [importlib ___directCallsEnabled___]) == true ifTrue: [ | rec |
		rec := self ___directCallRecover___: aSelector args: anArray.
		rec == #'___noRecover___' ifFalse: [^ rec]].
	(s size > 0 and: [s last = $:]) ifTrue: [
		"Keyword selector like `name:_:_:` — the corresponding Python
		function may have been compiled as varargs (`_name:kw:`) because
		it has *args/**kwargs or defaults.  Extract the base name from
		the selector (everything up to the first colon), look for the
		varargs form on this class, and dispatch with positional={anArray}
		and kwargs=nil."
		| colonIdx baseName varargsSel |
		colonIdx := s indexOf: $:.
		baseName := s copyFrom: 1 to: colonIdx - 1.
		varargsSel := ('_' , baseName , ':kw:') asSymbol.
		(has value: varargsSel) ifTrue: [
			| wrapped |
			wrapped := Array new: 2.
			wrapped at: 1 put: anArray.
			wrapped at: 2 put: nil.
			^ self perform: varargsSel env: 1 withArguments: wrapped
		].
		"@classmethod through an instance -- see ___tryClassMethodDNU___:."
		clsMeth := self ___tryClassMethodDNU___: aSelector args: anArray.
		clsMeth == #'___noClassMethod___' ifFalse: [^ clsMeth].
		"A sibling method on a recorded ``metaclass='' -- see
		___tryMetaclassMethodDNU___:args:."
		metaMeth := self ___tryMetaclassMethodDNU___: aSelector args: anArray.
		metaMeth == #'___noMetaMethod___' ifFalse: [^ metaMeth].
		^ MessageNotUnderstood new
        receiver: cls selector: aSelector args: anArray envId: envId ;
        signal
	].
	"Unary selector with 0 args — return BoundMethod if class has any
	same-named callable form (for `f = obj.method` patterns)."
	anArray size = 0 ifFalse: [
     ^ MessageNotUnderstood new
        receiver: cls selector: aSelector args: anArray envId: envId ; 
        signal ].
	"A 0-arg send whose only same-named method is the VARARGS form is a
	CALL, not a method read.  ``def __neg__(self, context=None)'' compiles
	to ___neg__:kw: with no 0-arg __neg__, so ``-x'' -- which UnaryOpAst
	emits as the bare send ``x __neg__'' -- landed here and got the bound
	method back as the VALUE of the expression: ``-Decimal(45)'' answered
	<BoundMethod object at 0x...> rather than Decimal('-45'), silently and
	with no error to point at.

	Reading a method as an attribute does NOT come through here.  ``k.zero''
	is served by the attribute path, which probes every arity variant
	INCLUDING the varargs one and makes its own BoundMethod; that is why
	``k.zero'' answers a bound method even though a real 0-arg ``zero''
	exists, which a bare send would have called.  So the reads this branch
	was written for were already someone else's job, and what actually
	reached it was operators.

	The fixed-arity spellings below keep answering a BoundMethod: a class
	with only ``foo:'' cannot satisfy a 0-arg call at all, so there is no
	call to prefer."
	varargsSel := ('_' , s , ':kw:') asSymbol.
	(has value: varargsSel) ifTrue: [
		| wrapped |
		wrapped := Array new: 2.
		wrapped at: 1 put: anArray.
		wrapped at: 2 put: nil.
		^ self perform: varargsSel env: 1 withArguments: wrapped].
	((has value: s , ':')
		or: [(has value: s , ':_:')
			or: [has value: s , ':_:_:']])
		ifTrue: [^ BoundMethod @env1:receiver: self selector: aSelector].
	"A 0-arg @classmethod called through an instance (``self.cm()'').
	Grail resolves the ``obj.m'' / ``obj.m()'' ambiguity in favour of
	CALLING for 0-arg instance methods, so do the same here."
	clsMeth := self ___tryClassMethodDNU___: aSelector args: anArray.
	clsMeth == #'___noClassMethod___' ifFalse: [^ clsMeth].
	"A 0-arg sibling method on a recorded ``metaclass='' -- see
	___tryMetaclassMethodDNU___:args:."
	metaMeth := self ___tryMetaclassMethodDNU___: aSelector args: anArray.
	metaMeth == #'___noMetaMethod___' ifFalse: [^ metaMeth].
	"A unary operator on a receiver that has no such dunder in ANY shape --
	every probe above has now missed, so nothing can still supply it.

	Without this a PythonInstance fell straight to the MNU below, and a
	Smalltalk MessageNotUnderstood is NOT catchable from Python: ``try: -obj
	except TypeError:'' did not handle it, it ABORTED the enclosing module.
	An error a program cannot catch is worse than a wrong message, which is
	why this is not merely about matching CPython's wording.

	The early exit above already refused kernel-backed receivers, so what
	arrives here is the user-defined classes it deliberately skipped."
	(self ___unaryOperandErrorMessage___: aSelector) ifNotNil: [:___um |
		TypeError @env1:___signal___: ___um].
  ^ MessageNotUnderstood new
      receiver: cls selector: aSelector args: anArray envId: envId ;
      signal

]

{ #category : 'Grail-Phase A Dynamic InstVars' }
Object >> dynamicInstVarAt: aSymbol ifAbsent: absentBlock [
	"Return the value of aSymbol's dynamic instance variable.  If no
	such instance variable exists, evaluate absentBlock and return
	its value.

	Treats Smalltalk ``nil'' as equivalent to ``absent'': Python's
	``None'' is a distinct NoneType singleton, never Smalltalk nil,
	so a nil read from dynamic-instVar storage can only mean ``slot
	does not exist''.  The nil-as-absent convention is enforced by
	Grail's own runtime helpers; Python user code can't violate it
	because the bridge never wraps Smalltalk nil into a Python-
	visible value.

	Used by Phase A NameAst codegen to raise NameError when a
	module-scope read names a binding that ``del'' removed (or that
	was never created)."

	| val |
	val := self dynamicInstVarAt: aSymbol.
	val == nil ifTrue: [^ absentBlock value].
	^ val

]
