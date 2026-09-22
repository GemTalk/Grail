! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyCode class (Python 'code' object -- func.__code__)
expectvalue /Class
doit
object subclass: 'PyCode'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyCode comment:
'Python code object -- what ``func.__code__`` returns.

Grail has no bytecode, so this is a lightweight metadata carrier holding only
the fields conformance code actually reads: ``co_name``, ``co_qualname``,
``co_filename`` and ``co_firstlineno`` (the 1-based source line of the ``def``
keyword, populated from FunctionDefAst>>beginLine).  Fields live in dynamic
instVars so a Python attribute read (``co.co_firstlineno``) resolves the VALUE
directly through object>>___pyAttrLoad___''s dynamic-instVar probe -- no
accessor method and no ___pythonValueAttrs___ whitelist entry needed (same
mechanism as ``slice``).

Phase 1 of the traceback design (docs/Python_Traceback_Design.md) defines this
class; Phase 2 stamps a PyCode onto every function at def-time so
``func.__code__`` answers a real object instead of raising AttributeError.
'
%

expectvalue /Class
doit
PyCode category: 'Grail-Tracebacks'
%

! ------------------- Remove existing methods from PyCode
expectvalue /Metaclass3
doit
PyCode removeAllMethods.
PyCode class removeAllMethods.
PyCode removeAllMethods: 1.
PyCode class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction (env 0; called by codegen + Smalltalk callers)
! ===============================================================================

category: 'Instance Creation'
classmethod: PyCode
name: aName qualname: aQualname filename: aFilename firstlineno: aLine
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
%

category: 'Instance Creation'
classmethod: PyCode
name: aName firstlineno: aLine
	"Convenience for callers with only a name + line to hand: co_qualname
	defaults to the name and co_filename to the placeholder.  Codegen no longer
	comes through here for a def in a real module -- it passes the module's path
	through the filename: variants below -- so the placeholder now means what it
	says: there is genuinely no file (exec / eval / the REPL doit path)."

	^ self name: aName qualname: aName filename: '<grail>' firstlineno: aLine
%

category: 'Instance Creation'
classmethod: PyCode
name: aName filename: aFilename firstlineno: aLine
	"As name:firstlineno: but with the module's real path.  co_qualname still
	defaults to the name: the nested-def cascade that uses this knows the def's
	own name but not its owning class or module."

	^ self name: aName qualname: aName filename: aFilename firstlineno: aLine
%

category: 'Instance Creation'
classmethod: PyCode
name: aName firstlineno: aLine argcount: argc posonlyargcount: poargc kwonlyargcount: kwargc
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
%

category: 'Instance Creation'
classmethod: PyCode
name: aName filename: aFilename firstlineno: aLine argcount: argc posonlyargcount: poargc kwonlyargcount: kwargc
	"The nested-def cascade's stamp: parameter counts plus the module's real
	path, but no qualname (a nested def's emitter knows its own name only)."

	| inst |
	inst := self name: aName firstlineno: aLine argcount: argc
		posonlyargcount: poargc kwonlyargcount: kwargc.
	inst dynamicInstVarAt: #'co_filename' put: aFilename.
	^ inst
%

category: 'Instance Creation'
classmethod: PyCode
name: aName qualname: aQualname firstlineno: aLine argcount: argc posonlyargcount: poargc kwonlyargcount: kwargc
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
%

category: 'Instance Creation'
classmethod: PyCode
name: aName qualname: aQualname filename: aFilename firstlineno: aLine argcount: argc posonlyargcount: poargc kwonlyargcount: kwargc
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
%

category: 'Grail-Attribute Access'
method: PyCode
___freevarCount___
	"How many free variables this code object describes -- the env-0 spelling of
	``len(co.co_freevars)'', for the __code__ assignment rule in ExecBlockAttrs,
	which runs in env 0 and would otherwise have to reach across for a size."

	| names |
	names := [self dynamicInstVarAt: #'___freevars___']
		on: AbstractException do: [:ex | ex return: nil].
	^ names isNil ifTrue: [0] ifFalse: [names size]
%

! ___pythonValueAttrs___ MUST be compiled in env 0 and on the CLASS side:
! object>>___pyAttrLoad___ consults it through an env-0 ``respondsTo:'', which
! never sees an env-1 method.  Filed in env 1 it compiles and is simply ignored,
! and ``co.co_freevars'' answers a BoundMethod instead of the tuple.

category: 'Grail-Python Attribute Hook'
classmethod: PyCode
___pythonValueAttrs___
	"``co_freevars'' is a VALUE attribute, not a callable.  Every OTHER co_*
	field is a dynamic instVar, which ___pyAttrLoad___ resolves to its value
	directly and so needs no entry here; this one is a computed accessor,
	because the empty case has to answer an empty tuple rather than be absent."

	^ IdentitySet new
		add: #'co_freevars';
		add: #'co_consts';
		yourself
%

category: 'Instance Creation'
classmethod: PyCode
___forCompiledSource___: aString filename: aFilename mode: aModeSymbol flags: anInteger
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
%


category: 'Grail-Attribute Access'
method: PyCode
___grailCompiledSource___
	"The source text this code object carries, or nil when it is a def's
	metadata rather than a compile() result."

	^ [self dynamicInstVarAt: #'___grailSource___']
		on: AbstractException do: [:ex | ex return: nil]
%

category: 'Grail-Attribute Access'
method: PyCode
___grailCompiledMode___
	"The mode compile() was given -- #exec, #eval or #single -- or nil."

	^ [self dynamicInstVarAt: #'___grailMode___']
		on: AbstractException do: [:ex | ex return: nil]
%

category: 'Instance Creation'
method: PyCode
___setFlags___: anInteger
	"Record ``co_flags'' and answer self, so the emitters can chain it onto the
	constructor without restating every keyword.  A dynamic instVar named
	exactly as the Python attribute, so ``co.co_flags'' reads it straight
	through ___pyAttrLoad___'s dynamic-instVar probe -- no accessor and no
	___pythonValueAttrs___ entry needed."

	self dynamicInstVarAt: #'co_flags' put: anInteger.
	^ self
%

category: 'Grail-Attribute Access'
method: PyCode
___codeKindBits___
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
%

category: 'Instance Creation'
method: PyCode
___setConsts___: anArray
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
%

category: 'Instance Creation'
method: PyCode
___setFreevars___: anArrayOfNames
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
%

set compile_env: 1

category: 'Grail-Python Protocol'
method: PyCode
co_consts
	"``code.co_consts'': the constants the code references, with any NESTED
	code objects among them.

	Grail compiles Python to Smalltalk methods and keeps no constant pool, so
	this is EMPTY -- and empty is the honest answer rather than a placeholder:
	there is nothing to enumerate, not an unknown number of things.

	It has to exist, though, and the reason is worth recording.  While
	compile() answered a str, code that walks a code object's constants took
	its ``isinstance(maybe_code, types.CodeType)'' guard and skipped -- which
	looked like passing.  test_listcomps' _recursive_replace is exactly that
	shape, and the moment compile() answered a real code object it went
	through the guard and reached here.  A missing attribute would have turned
	a correct change into a regression in a module that never mentions
	compile().

	What an empty tuple costs is a test that COUNTS what is in there:
	test_builtin's test_all_any_tuple_optimization asserts a genexp leaves
	exactly one nested code object, and gets none."

	| v |
	"dynamicInstVarAt: answers NIL for a name that was never stored rather
	than raising, so the handler alone is not enough -- an unset slot came
	back as Smalltalk nil, which Python saw as an UndefinedObject and could
	not iterate."
	v := [self @env0:dynamicInstVarAt: #'co_consts']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	v @env0:isNil ifTrue: [^ tuple @env0:withAll: (Array @env0:new: 0)].
	^ v
%

category: 'Grail-Python Protocol'
method: PyCode
_replace: positional kw: kwargs
	"``code.replace(**kwargs)'': a COPY with the named co_ fields changed.

	jinja2's debug.py calls ``code.replace(co_name=location)'' on every
	compile() result to name a template frame, and that call is the reason
	this exists.  While compile() answered the SOURCE STRING it reached
	str.replace instead -- ``replace'' is in both APIs, and the collision made
	a keyword-only call on a string, which used to kill a Flask app rendering
	a template that named a missing filter.  Now that compile() answers a real
	code object the call has to land somewhere, and this is where.

	A COPY, never a mutation: CPython's code objects are immutable, and
	jinja2 keeps the original.  Unknown keywords are refused rather than
	ignored, because a silently-dropped co_ field is a wrong frame name rather
	than a missing one.

	Only the fields Grail carries can be set; the rest of CPython's code
	object -- bytecode, constants, line tables -- does not exist here, so
	asking for one is a TypeError naming it."

	| copy known |
	positional @env0:isEmpty @env0:ifFalse: [
		^ TypeError ___signal___:
			'replace() takes no positional arguments'].
	known := #('co_name' 'co_qualname' 'co_filename' 'co_firstlineno' 'co_flags'
		'co_consts').
	copy := self @env0:class @env0:new.
	#('co_name' 'co_qualname' 'co_filename' 'co_firstlineno' 'co_flags'
	  'co_consts' '___grailSource___' '___grailMode___') @env0:do: [:n |
		| v |
		v := [self @env0:dynamicInstVarAt: n @env0:asSymbol]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		v @env0:isNil @env0:ifFalse: [
			copy @env0:dynamicInstVarAt: n @env0:asSymbol put: v]].
	kwargs @env0:isNil @env0:ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v |
			(known @env0:includes: k @env0:asString) @env0:ifFalse: [
				^ TypeError ___signal___: ('replace() got an unexpected keyword argument '''
					@env0:, k @env0:asString @env0:, '''')].
			copy @env0:dynamicInstVarAt: k @env0:asString @env0:asSymbol put: v]].
	^ copy
%
category: 'Grail-Attribute Access'
method: PyCode
co_freevars
	"``code.co_freevars'' -- a tuple of the def's free variable names.

	An empty tuple when the def closes over nothing, which is CPython's answer
	and not an absence: ``len(co.co_freevars)'' is how the __code__ assignment
	rule is stated, so a missing attribute would make the check impossible to
	write rather than merely unavailable."

	| names |
	"``dynamicInstVarAt:'' is env-0 EXPLICITLY: a bare send from this env-1
	method is looked up in env 1, where there is none, so the handler swallowed
	the MessageNotUnderstood and every code object reported an empty tuple."
	names := [self @env0:dynamicInstVarAt: #'___freevars___']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	^ (ExecBlock @env0:___pyTupleClass___)
		@env0:perform: #'withAll:' env: 0
		withArguments: { names @env0:ifNil: [#()] }
%

set compile_env: 1

category: 'Grail-Comparison'
method: PyCode
__eq__: other
	"CPython's code objects compare by VALUE, not by identity, so this is
	ordinary conformance rather than a concession -- unlike PyFrame's __eq__,
	which 9.47 records as a deliberate divergence.

	Grail mints a fresh PyCode for each reconstructed frame, so identity would
	answer False for two readings of one function.  The identifying fields are
	the name, the file and the first line; two different functions cannot share
	all three."

	(other @env0:isKindOf: PyCode) ifFalse: [^ false].
	^ ((self @env0:dynamicInstVarAt: #'co_name')
			@env0:= (other @env0:dynamicInstVarAt: #'co_name'))
		and: [((self @env0:dynamicInstVarAt: #'co_filename')
			@env0:= (other @env0:dynamicInstVarAt: #'co_filename'))
		and: [(self @env0:dynamicInstVarAt: #'co_firstlineno')
			@env0:= (other @env0:dynamicInstVarAt: #'co_firstlineno')]]
%

category: 'Grail-Comparison'
method: PyCode
__ne__: other
	^ (self __eq__: other) @env0:not
%

category: 'Grail-Comparison'
method: PyCode
__hash__
	"Consistent with __eq__: name, file, first line."

	^ ((self @env0:dynamicInstVarAt: #'co_name') @env0:hash)
		@env0:bitXor: (((self @env0:dynamicInstVarAt: #'co_filename') @env0:hash)
			@env0:bitXor: ((self @env0:dynamicInstVarAt: #'co_firstlineno') @env0:hash))
%

category: 'Grail-String Representation'
method: PyCode
__repr__
	"A <code object NAME, file FILE, line N> style string -- close enough to
	CPython for debugging; nothing conformance-critical reads this."

	| stream |
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: '<code object '.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'co_name') @env0:asString.
	stream @env0:nextPutAll: ', file "'.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'co_filename') @env0:asString.
	stream @env0:nextPutAll: '", line '.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'co_firstlineno') @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

set compile_env: 0
