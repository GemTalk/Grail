! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- enum class (Python 'enum' module)
expectvalue /Class
doit
module subclass: 'enum'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
enum comment:
'Python enum module (stub).

Provides support for enumerations.
Currently stubs IntFlag, KEEP, global_enum, and _simple_enum
to allow import re to proceed.
See https://docs.python.org/3/library/enum.html
'
%

expectvalue /Class
doit
enum category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
enum removeAllMethods: 1.
enum class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: enum
initialize
	"Initialize stored attributes."
	self @env0:at: #IntFlag put: int.
	self @env0:at: #KEEP put: #KEEP.
	"Enum / IntEnum / StrEnum / Flag — Jinja2 uses ``enum.Enum`` as
	a marker base class for module-private states like
	``_PassArg(enum.Enum): context = enum.auto()``.  Grail has no
	enum machinery yet; alias them to ``PythonInstance`` so user
	classes can subclass without erroring at import time.  The
	per-member ``auto()`` calls just produce unique integers (see
	``auto`` below) — sufficient for membership-style dispatch."
	self @env0:at: #Enum put: PythonInstance.
	self @env0:at: #IntEnum put: int.
	self @env0:at: #StrEnum put: Unicode7.
	self @env0:at: #Flag put: PythonInstance.
	"Pre-store ``auto'' as a BoundMethod so ``from enum import auto''
	binds to the callable rather than invoking the unary method
	immediately and binding its result (an integer).  Werkzeug's
	sansio.multipart hits this via ``State(Enum): PREAMBLE = auto()''."
	self @env0:dynamicInstVarAt: #auto put: (BoundMethod @env1:receiver: self selector: #auto)
%

! ===============================================================================
! Stored-attribute accessors
! ===============================================================================

category: 'Grail-Accessors'
method: enum
IntFlag
	^ self @env0:at: #IntFlag
%

category: 'Grail-Accessors'
method: enum
KEEP
	^ self @env0:at: #KEEP
%

category: 'Grail-Accessors'
method: enum
Enum
	^ self @env0:at: #Enum
%

category: 'Grail-Accessors'
method: enum
IntEnum
	^ self @env0:at: #IntEnum
%

category: 'Grail-Accessors'
method: enum
StrEnum
	^ self @env0:at: #StrEnum
%

category: 'Grail-Accessors'
method: enum
Flag
	^ self @env0:at: #Flag
%

category: 'Grail-Built-in Functions'
method: enum
auto
	"``enum.auto()`` — return a fresh unique integer.  CPython
	tracks per-class counters; here we use a process-global counter
	stored on the module instance.  Adequate for Jinja2's
	``_PassArg`` membership-test usage."

	| counter |
	counter := (self @env0:at: #'__auto_counter' otherwise: 0) @env0:+ 1.
	self @env0:at: #'__auto_counter' put: counter.
	^ counter
%

! ===============================================================================
! Fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: enum
global_enum: cls
	"global_enum(cls) — injects each of cls's class-side attributes
	into the defining module's globals, then returns the class.

	Equivalent of CPython's ``@enum.global_enum``: after the
	decorator runs, every enum member is reachable both as
	``Cls.MEMBER`` and as a bare module-level ``MEMBER`` name.  In
	Grail the class-side attributes are paired ``X`` / ``X:``
	methods on the metaclass (compiled by ClassDefAst codegen for
	each class-body ``NAME = value`` statement); we iterate those
	pairs, read each value via the unary getter, and store it on
	the module instance (which is a SymbolDictionary).

	The defining module is read from the synthetic ``__module__``
	class slot that ClassDefAst stamps on every Python user class.
	Names starting with ``_`` are skipped — they're not enum members
	(internal ones include ``__module__`` itself)."

	| module classMd processed |
	module := cls @env0:perform: #'__module__' env: 1.
	classMd := cls @env0:class @env0:methodDictForEnv: 1.
	processed := IdentitySet @env0:new.
	classMd @env0:keysDo: [:sel |
		| nameStr setter |
		nameStr := sel @env0:asString.
		((nameStr @env0:size @env0:> 0
			and: [(nameStr @env0:at: 1) @env0:= $_]) not
			and: [(processed @env0:includes: sel) not]) ifTrue: [
			setter := (nameStr @env0:, ':') @env0:asSymbol.
			(classMd @env0:includesKey: setter) ifTrue: [
				| val |
				val := cls @env0:perform: sel env: 1.
				module @env0:dynamicInstVarAt: sel put: val.
				processed @env0:add: sel.
			].
		].
	].
	^ cls
%

category: 'Grail-Built-in Functions'
method: enum
__simple_enum: positional kw: kwargs
	"_simple_enum(cls) or _simple_enum(cls, boundary=...) -> decorator.
	Returns a decorator that returns the class unchanged.
	Used by re module: @enum._simple_enum(IntFlag, boundary=enum.KEEP).
	Grail's varargs-selector convention prepends one underscore to
	the Python name, so the Python ``_simple_enum`` becomes the
	Smalltalk selector ``__simple_enum:kw:``."

	^ [:positional2 :keywords2 | positional2 @env0:at: 1]
%

set compile_env: 0
