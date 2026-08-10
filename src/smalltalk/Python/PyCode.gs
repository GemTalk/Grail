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

set compile_env: 1

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
