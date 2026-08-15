! ------------------- Superclass check
run
PropertyDescriptor ifNil: [self error: 'PropertyDescriptor is not defined. Check file ordering.'].
%

! ===============================================================================
! DynamicClassAttribute -- ``enum.property'' / ``types.DynamicClassAttribute''.
!
! A property that is deliberately INVISIBLE ON THE CLASS.  It exists so an enum
! member can have a ``name'' while the enum CLASS keeps its own meaning for that
! name, and CPython spells that difference in __get__:
!
!     class C(Enum):
!         A = 1
!         foo = enum.property(lambda self: 'foo-' + self.name)
!
!     C.A.foo    'foo-A'          -- instance access runs the getter
!     C.foo      AttributeError   -- CLASS access is refused
!
! An ordinary property answers the DESCRIPTOR ITSELF for class access, which is
! what makes ``C.prop.fget'' work, and PropertyDescriptor is right to do that.
! Grail exported ``enum.property'' as PropertyDescriptor itself, so the two were
! one object with one behaviour, and the enum case took the property answer:
! ``C.foo'' handed back the descriptor where CPython raises.
!
! The whole difference is the one method below.  Everything else -- fget/fset/
! fdel, the doc handling, __set__/__delete__, the ___isValueDescriptor___:
! test that routes a class-attribute read through a descriptor -- is inherited,
! and isKindOf: PropertyDescriptor still answers true, so enum's existing
! descriptor handling (___grailInstallClassDescriptor:, which keeps a descriptor
! out of the member set) is unchanged.
!
! Being a distinct CLASS is also what lets inspect find these.  CPython's
! getmembers sweeps the bases for ``isinstance(v, DynamicClassAttribute)'' --
! such a descriptor hides from dir(), so nothing else would offer it -- and with
! one class serving both spellings that test could not be written.
!
! (Upstream, ``enum.property'' and ``types.DynamicClassAttribute'' are two
! distinct classes; Grail's types.py imports one from the other, which is a
! pre-existing simplification this file inherits rather than introduces.)
!
! WHAT THIS DOES AND DOES NOT COVER.  The CALL form, ``foo = enum.property(f)'',
! works on a plain class and in an enum body: class access raises.  Still open,
! and none of it a regression -- each behaves exactly as it did before:
!
!   * the DECORATOR form, ``@enum.property def foo'', compiles to a plain getter
!     METHOD and builds no descriptor, so class access hands back an
!     UnboundMethod.  That is the commoner spelling, and closing it is a
!     ClassDefAst change (the decorated def is re-classed at parse time).
!   * the AttributeError from the functional enum form names the GETTER FUNCTION
!     (``_foo'') rather than the bound name: the descriptor never learns the
!     latter, which is what CPython's __set_name__ supplies.
!   * Enum.name / Enum.value are still plain Smalltalk methods rather than
!     instances of this class, so inspect.getmembers still cannot see them --
!     which is what test_inspect_getmembers and test_inspect_classify_class_attrs
!     need.
!
! ONE THING THIS CLASS BROKE, now fixed, and worth reading before adding
! another: introducing it made ``pickle.dumps(enum.property)'' ORDER-DEPENDENT.
! Its __qualname__ was 'DynamicClassAttribute' and ``types'' exposes it under
! exactly that name, so pickle's whichmodule() scan of sys.modules found it only
! once something had imported types -- EnumPickleByNameTestCase passed alone and
! failed in a whole-suite run.  install.gs now stamps this class's
! __module__/__qualname__ as 'enum'/'property'; see
! object class >> ___stampPythonIdentity___: for the general shape of that
! defect, which 12 more Grail classes still have.
! ===============================================================================

! ------- DynamicClassAttribute class definition
expectvalue /Class
doit
PropertyDescriptor subclass: 'DynamicClassAttribute'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
DynamicClassAttribute category: 'Grail-Modules'
%

! ------------------- Remove existing behavior
removeallmethods DynamicClassAttribute
removeallclassmethods DynamicClassAttribute

! env 1, like PropertyDescriptor's own __get__:_: -- the descriptor protocol is
! Python protocol, and object >> ___classDescriptorGet___: sends __get__ as an
! env-1 send.  Compiled in env 0 the override is simply never found, and the
! inherited property behaviour answers instead.
set compile_env: 1

category: 'Grail-Descriptor Protocol'
method: DynamicClassAttribute
__get__: instance _: owner
	"Instance access runs the getter, exactly as a property does.  CLASS access
	is REFUSED -- that is the entire point of the descriptor, and the one place
	it parts company with its superclass, which answers the descriptor itself.

	The message is the one an ordinary missing attribute produces, because to
	the caller that is what this is: CPython's DynamicClassAttribute.__get__
	raises a bare AttributeError so the class's own __getattr__ gets its turn."

	(instance == nil or: [instance == None]) ifTrue: [
		^ AttributeError @env0:___signalMissing___: self ___propName___ @env0:asString
			on: owner].
	^ super __get__: instance _: owner
%

! Back to env 0 for the files that follow -- ``set compile_env:'' is global
! topaz state, and leaving it at 1 compiled the NEXT file's class definitions
! in env 1 (``a PythonInstance class does not understand #subclass:...'').
set compile_env: 0
