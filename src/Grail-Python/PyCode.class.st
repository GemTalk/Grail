"Python code object -- what ``func.__code__`` returns.

Grail has no bytecode, so this is a lightweight metadata carrier holding only
the fields conformance code actually reads: ``co_name``, ``co_qualname``,
``co_filename`` and ``co_firstlineno`` (the 1-based source line of the ``def``
keyword, populated from FunctionDefAst>>beginLine).  Fields live in dynamic
instVars so a Python attribute read (``co.co_firstlineno``) resolves the VALUE
directly through object>>___pyAttrLoad___'s dynamic-instVar probe -- no
accessor method and no ___pythonValueAttrs___ whitelist entry needed (same
mechanism as ``slice``).

Phase 1 of the traceback design (docs/Python_Traceback_Design.md) defines this
class; Phase 2 stamps a PyCode onto every function at def-time so
``func.__code__`` answers a real object instead of raising AttributeError.

"
Class {
	#name : 'PyCode',
	#superclass : 'object',
	#category : 'Grail-Tracebacks'
}

{ #category : 'Instance Creation' }
PyCode class >> ___forCompiledSource___: aString filename: aFilename mode: aModeSymbol flags: anInteger [
	"The code object ``compile()'' answers.

	Grail has no bytecode, so what makes this object EXECUTABLE is the source
	it carries: exec()/eval() read it back out and run the text.  Before this,
	compile() answered the source STRING itself and kept its mode and filename
	in two identity-keyed side tables -- which worked, and meant the result had
	no co_filename, no co_flags and no co_name, so anything that introspected a
	code object saw a str.  jinja2 carries a ``hasattr(code, 'co_filename')''
	fallback for exactly that.

	``co_flags'' matters beyond introspection: CPython sets CO_COROUTINE on a
	module compiled with PyCF_ALLOW_TOP_LEVEL_AWAIT whose body actually awaits,
	and that bit is how a caller knows to run the result with ``await'' rather
	than exec().  test_compile_top_level_await_no_coro asserts it is NOT set
	for ordinary code, which is a claim about every compile in the suite.

	The source and mode live under Grail-internal names so they do not surface
	as Python attributes of the code object; the four co_ fields do."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'co_name' put: '<module>'.
	inst dynamicInstVarAt: #'co_qualname' put: '<module>'.
	inst dynamicInstVarAt: #'co_filename' put: aFilename.
	inst dynamicInstVarAt: #'co_firstlineno' put: 1.
	inst dynamicInstVarAt: #'co_flags' put: anInteger.
	inst dynamicInstVarAt: #'___grailSource___' put: aString.
	inst dynamicInstVarAt: #'___grailMode___' put: aModeSymbol.
	^ inst

]

{ #category : 'Grail-Python Attribute Hook' }
PyCode class >> ___pythonValueAttrs___ [
	"``co_freevars'' is a VALUE attribute, not a callable.  Every OTHER co_*
	field is a dynamic instVar, which ___pyAttrLoad___ resolves to its value
	directly and so needs no entry here; this one is a computed accessor,
	because the empty case has to answer an empty tuple rather than be absent."

	^ IdentitySet new
		add: #'co_freevars';
		add: #'co_consts';
		add: #'co_varnames';
		add: #'co_argcount';
		add: #'co_posonlyargcount';
		add: #'co_kwonlyargcount';
		add: #'co_flags';
		yourself

]

{ #category : 'Instance Creation' }
PyCode class >> name: aName filename: aFilename firstlineno: aLine [
	"As name:firstlineno: but with the module's real path.  co_qualname still
	defaults to the name: the nested-def cascade that uses this knows the def's
	own name but not its owning class or module."

	^ self name: aName qualname: aName filename: aFilename firstlineno: aLine

]

{ #category : 'Instance Creation' }
PyCode class >> name: aName filename: aFilename firstlineno: aLine argcount: argc posonlyargcount: poargc kwonlyargcount: kwargc [
	"The nested-def cascade's stamp: parameter counts plus the module's real
	path, but no qualname (a nested def's emitter knows its own name only)."

	| inst |
	inst := self name: aName firstlineno: aLine argcount: argc
		posonlyargcount: poargc kwonlyargcount: kwargc.
	inst dynamicInstVarAt: #'co_filename' put: aFilename.
	^ inst

]

{ #category : 'Instance Creation' }
PyCode class >> name: aName firstlineno: aLine [
	"Convenience for callers with only a name + line to hand: co_qualname
	defaults to the name and co_filename to the placeholder.  Codegen no longer
	comes through here for a def in a real module -- it passes the module's path
	through the filename: variants below -- so the placeholder now means what it
	says: there is genuinely no file (exec / eval / the REPL doit path)."

	^ self name: aName qualname: aName filename: '<grail>' firstlineno: aLine

]

{ #category : 'Instance Creation' }
PyCode class >> name: aName firstlineno: aLine argcount: argc posonlyargcount: poargc kwonlyargcount: kwargc [
	"Def-time stamp variant that also records the three parameter counts a
	code object exposes: ``co_argcount'' (positional params -- posonly +
	regular, INCLUDING an implicit self/cls, matching CPython),
	``co_posonlyargcount'' and ``co_kwonlyargcount''.  test_keywordonlyarg's
	testKwDefaults reads ``co_kwonlyargcount''; the two siblings are the same
	cheap codegen input and are commonly read alongside it (inspect,
	functools).  Stored as dynamic instVars so ``co.co_kwonlyargcount'' reads
	straight through the ___pyAttrLoad___ dynamic-instVar probe."

	| inst |
	inst := self name: aName firstlineno: aLine.
	inst dynamicInstVarAt: #'co_argcount' put: argc.
	inst dynamicInstVarAt: #'co_posonlyargcount' put: poargc.
	inst dynamicInstVarAt: #'co_kwonlyargcount' put: kwargc.
	^ inst

]

{ #category : 'Instance Creation' }
PyCode class >> name: aName qualname: aQualname filename: aFilename firstlineno: aLine [
	"Build a code object.  Fields are stored as dynamic instVars named exactly
	as the Python attributes so ``co.co_firstlineno`` reads the value straight
	through the ___pyAttrLoad___ dynamic-instVar probe."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'co_name' put: aName.
	inst dynamicInstVarAt: #'co_qualname' put: aQualname.
	inst dynamicInstVarAt: #'co_filename' put: aFilename.
	inst dynamicInstVarAt: #'co_firstlineno' put: aLine.
	^ inst

]

{ #category : 'Instance Creation' }
PyCode class >> name: aName qualname: aQualname filename: aFilename firstlineno: aLine argcount: argc posonlyargcount: poargc kwonlyargcount: kwargc [
	"The full def-time stamp: the sibling above plus the module's real path.

	co_filename used to be the '<grail>' placeholder for every code object on
	the grounds that Grail has no file-backed ones and the traceback design
	would supply source TEXT through the PEP 657 position array instead.  Both
	halves turned out to be wrong: the emitters DO know the module's path at
	compile time (it is on the ModuleAst), and a real path is what lets
	linecache -- which every stdlib traceback consumer reaches for -- read the
	source line itself.  See §9 of docs/Python_Traceback_Design.md."

	| inst |
	inst := self name: aName qualname: aQualname firstlineno: aLine argcount: argc
		posonlyargcount: poargc kwonlyargcount: kwargc.
	inst dynamicInstVarAt: #'co_filename' put: aFilename.
	^ inst

]

{ #category : 'Instance Creation' }
PyCode class >> name: aName qualname: aQualname firstlineno: aLine argcount: argc posonlyargcount: poargc kwonlyargcount: kwargc [
	"Def-time stamp for a def that compiles to a real Smalltalk METHOD rather
	than a block -- a class-body def or a module top-level def.  Same fields as
	the block variant beside it, plus an explicit ``co_qualname'': the emitter
	(ClassDefAst >> emitMethodCodeTableOn:className:, importlib's top-level pass)
	knows the owning class / module name, which the method itself cannot
	recover later, and CPython reports ``C.m'' / ``f'' there.

	Keeps the placeholder filename; the filename: variant below is what codegen
	uses for a def in a real module."

	| inst |
	inst := self name: aName firstlineno: aLine argcount: argc
		posonlyargcount: poargc kwonlyargcount: kwargc.
	inst dynamicInstVarAt: #'co_qualname' put: aQualname.
	^ inst

]

{ #category : 'Grail-Attribute Access' }
PyCode >> ___codeKindBits___ [
	"The three flags that say what KIND of callable this code is -- generator
	(32), coroutine (128), async generator (512) -- and nothing else.

	CPython deprecates ``f.__code__ = g.__code__'' across a mismatch in exactly
	these, because the function's calling protocol and its code would then
	disagree; the parameter-shape flags beside them (VARARGS, VARKEYWORDS,
	NESTED) legitimately differ between two functions and must not trip it."

	| f |
	f := [self dynamicInstVarAt: #'co_flags']
		on: AbstractException do: [:ex | ex return: nil].
	f isNil ifTrue: [^ 0].
	^ f bitAnd: 672

]

{ #category : 'Grail-Attribute Access' }
PyCode >> ___freevarCount___ [
	"How many free variables this code object describes -- the env-0 spelling of
	``len(co.co_freevars)'', for the __code__ assignment rule in ExecBlockAttrs,
	which runs in env 0 and would otherwise have to reach across for a size."

	| names |
	names := [self dynamicInstVarAt: #'___freevars___']
		on: AbstractException do: [:ex | ex return: nil].
	^ names isNil ifTrue: [0] ifFalse: [names size]

]

{ #category : 'Grail-Attribute Access' }
PyCode >> ___grailBodySource___ [
	"The def's body text, or nil for a code object that is not a def's."

	^ [self dynamicInstVarAt: #'___grailBodySource___']
		on: AbstractException do: [:ex | ex return: nil]

]

{ #category : 'Grail-Attribute Access' }
PyCode >> ___grailCompiledMode___ [
	"The mode compile() was given -- #exec, #eval or #single -- or nil."

	^ [self dynamicInstVarAt: #'___grailMode___']
		on: AbstractException do: [:ex | ex return: nil]

]

{ #category : 'Grail-Attribute Access' }
PyCode >> ___grailCompiledSource___ [
	"The source text this code object carries, or nil when it is a def's
	metadata rather than a compile() result."

	^ [self dynamicInstVarAt: #'___grailSource___']
		on: AbstractException do: [:ex | ex return: nil]

]

{ #category : 'Grail-Attribute Access' }
PyCode >> ___grailOptimizeLevel___ [
	"The optimize level this code object was compiled with, or nil."

	^ [self dynamicInstVarAt: #'___grailOptimize___']
		on: AbstractException do: [:ex | ex return: nil]

]

{ #category : 'Instance Creation' }
PyCode >> ___setBodySource___: aString [
	"Record the def's BODY text, and answer self.

	``exec(f.__code__, g, closure=cells)'' has to run that body with the given
	cells, and Grail has no way to re-enter a compiled closure with different
	ones -- its free variables are Smalltalk temps captured at def time.
	Running the text again, against a namespace backed by the cells, is what
	makes the substitution observable at all.

	Under a Grail-internal name: CPython's code object has no such field, and
	it must not surface as an attribute of one."

	self dynamicInstVarAt: #'___grailBodySource___' put: aString.
	^ self

]

{ #category : 'Instance Creation' }
PyCode >> ___setConsts___: anArray [
	"Record ``co_consts'' and answer self, so the emitters can chain it onto
	the constructor.

	Grail keeps no constant POOL -- it compiles Python to Smalltalk methods --
	so what goes in here is the part of co_consts that is OBSERVABLE and
	stable: one code object per nested scope that CPython gives one.  Since
	3.12 that is a GENERATOR EXPRESSION and a nested def or lambda; list, set
	and dict comprehensions were inlined and no longer appear.  Counting them
	is a real question code asks -- test_builtin's
	test_all_any_tuple_optimization checks that a genexp leaves exactly one,
	which is how it verifies the comprehension was not duplicated."

	self dynamicInstVarAt: #'co_consts' put: anArray.
	^ self

]

{ #category : 'Instance Creation' }
PyCode >> ___setDecoratedLine___: aLine [
	"A decorated def's ``co_firstlineno'': its FIRST DECORATOR's line, as in
	CPython, where the ``firstlineno:'' the constructor took is the ``def''
	line (#1406).  Set afterwards, not passed to the constructor, because the
	traceback walk reads that constructor text to find which nested def a
	line belongs to (BaseException class >> ___firstlinenoAfter___:from:), and
	a decorator line is not in the def's body.  Answers self, like the other
	setters chained onto the constructor."

	self dynamicInstVarAt: #'co_firstlineno' put: aLine.
	^ self

]

{ #category : 'Instance Creation' }
PyCode >> ___setFlags___: anInteger [
	"Record ``co_flags'' and answer self, so the emitters can chain it onto the
	constructor without restating every keyword.  A dynamic instVar named
	exactly as the Python attribute, so ``co.co_flags'' reads it straight
	through ___pyAttrLoad___'s dynamic-instVar probe -- no accessor and no
	___pythonValueAttrs___ entry needed."

	self dynamicInstVarAt: #'co_flags' put: anInteger.
	^ self

]

{ #category : 'Instance Creation' }
PyCode >> ___setFreevars___: anArrayOfNames [
	"Record this def's FREE VARIABLE names -- the ones CPython reports as
	``co_freevars'' -- and answer self so the emitters can cascade it onto the
	constructor without restating every keyword.

	The names come from CallAst>>___freeVariableNamesFor___:, the same set that
	drives ___pyClosure___: and locals(), so co_freevars and __closure__ cannot
	disagree about how many there are.  That agreement is the point: CPython
	refuses ``f.__code__ = g.__code__'' when the two disagree, because the
	function's cells and its code would then describe different closures."

	anArrayOfNames isNil ifTrue: [^ self].
	self dynamicInstVarAt: #'___freevars___' put: anArrayOfNames.
	^ self

]

{ #category : 'Instance Creation' }
PyCode >> ___setOptimize___: aLevel [
	"Record the ``optimize'' level compile() was given, and answer self.

	It has to travel WITH the code object, not be a property of the compile
	call, because Grail compiles from text at exec() time: the level chosen
	when compile() ran is the one the eventual codegen must see, and the two
	can be far apart.  Under a Grail-internal name, so it is not a Python
	attribute of the code object -- CPython has none."

	self dynamicInstVarAt: #'___grailOptimize___' put: aLevel.
	^ self

]

{ #category : 'Instance Creation' }
PyCode >> ___setVarnames___: anArrayOfNames [
	"Record the def's PARAMETER names for ``co_varnames'', in CPython's order,
	and answer self for the emitters' chain (FunctionDefAst >> ___coVarnames___
	says what is and is not in it)."

	anArrayOfNames isNil ifTrue: [^ self].
	self dynamicInstVarAt: #'___varnames___' put: anArrayOfNames.
	^ self

]
