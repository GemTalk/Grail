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
	self @env0:at: #KEEP put: #KEEP.
	"FlagBoundary + verify() constants: opaque symbols are enough for
	``from enum import STRICT, CONFORM, ...`` to resolve (test_enum)."
	self @env0:at: #STRICT put: #STRICT.
	self @env0:at: #CONFORM put: #CONFORM.
	self @env0:at: #EJECT put: #EJECT.
	self @env0:at: #UNIQUE put: #UNIQUE.
	self @env0:at: #CONTINUOUS put: #CONTINUOUS.
	self @env0:at: #NAMED_FLAGS put: #NAMED_FLAGS.
	self @env0:at: #ReprEnum put: Enum.
	self @env0:at: #EnumDict put: dict.
	"Enum / IntEnum / IntFlag / StrEnum / Flag are all real classes now
	(see PyEnumTypes.gs): ``class X(IntEnum): A = 1`` builds real members
	via the metaclass hook ``___pyClassDefined___:``.  StrEnum is
	AbstractPyStr-rooted so its members ARE strings (str(member) == value,
	the ReprEnum contract)."
	self @env0:at: #Enum put: Enum.
	self @env0:at: #EnumType put: Enum @env0:class.
	self @env0:at: #property put: PropertyDescriptor.
	self @env0:at: #member put: PropertyDescriptor.
	self @env0:at: #nonmember put: PropertyDescriptor.
	self @env0:at: #unique put: PropertyDescriptor.
	self @env0:at: #auto put: PropertyDescriptor.
	self @env0:at: #EnumMeta put: Enum @env0:class.
	self @env0:at: #IntEnum put: IntEnum.
	self @env0:at: #IntFlag put: IntFlag.
	self @env0:at: #StrEnum put: StrEnum.
	self @env0:at: #Flag put: Flag.
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
	"``enum.auto()`` — return a marker that ___grailBuildMembers:
	resolves to last-integer-value + 1 in declaration order (CPython
	per-class semantics; a process-global counter gave arbitrary
	values -- 112 test_enum errors expected first/second/third = 1/2/3)."

	^ GrailEnumAuto @env0:new
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
	"__module__ is the dotted NAME STRING (CPython semantics) -- resolve
	the instance through sys.modules; tolerate a module INSTANCE stored
	by older codegen.  Unresolvable name -> decorator is a no-op."
	(module @env0:isKindOf: CharacterCollection) ifTrue: [
		module := importlib modules
			@env0:at: (module @env0:asString @env0:asSymbol)
			otherwise: nil.
		module @env0:isNil ifTrue: [^ cls]].
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

category: 'Grail-Built-in Functions'
method: enum
_verify: positional kw: kwargs
	"@verify(UNIQUE, ...) -> decorator returning the class unchanged.
	The checks it performs in CPython are advisory; skipping them only
	means we never raise on a malformed enum definition."

	^ [:positional2 :keywords2 | positional2 @env0:at: 1]
%

category: 'Grail-Built-in Functions'
method: enum
__test_simple_enum: positional kw: kwargs
	"_test_simple_enum(checked, simple) — CPython-internal consistency
	check between a @_simple_enum class and its handwritten twin.
	Nothing to verify here; return None."

	^ None
%

category: 'Grail-Built-in Functions'
method: enum
_iter_bits_lsb: num
	"_iter_bits_lsb(n) — yield each set bit, least-significant first.
	Return the materialized list; callers only iterate it."

	| result n |
	result := OrderedCollection @env0:new.
	n := num.
	[n @env0:> 0] @env0:whileTrue: [
		| bit |
		bit := n @env0:bitAnd: (n @env0:negated).
		result @env0:add: bit.
		n := n @env0:- bit].
	^ result
%

set compile_env: 0

! The module singleton is committed and lazily initialized; clear it so
! the updated ``initialize`` above (real Enum/IntEnum/IntFlag classes)
! re-runs on next access instead of returning a stale cached instance.
run
enum @env1:clearInstance.
%
