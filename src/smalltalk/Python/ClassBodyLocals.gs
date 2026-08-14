! ------------------- Superclass check
run
PyDict ifNil: [self error: 'PyDict is not defined. Check file ordering.'].
%

! ===============================================================================
! ClassBodyLocals -- what ``locals()'' / ``vars()'' answers inside a CLASS BODY.
!
! A class body executes as a NAMESPACE, so CPython's locals() there is the
! mapping being built into the class, and writing through it binds a class
! attribute:
!
!     x = 42
!     class X:
!         locals()['x'] = 43
!         y = x               -- 43: the class body reads its own namespace
!
! Grail compiles a class body STRUCTURALLY -- it scans the body for the names it
! binds and emits one store per name -- so there is no mapping for a write like
! that to land in.  The dict class-body locals() used to answer was a SNAPSHOT:
! reads were right and every write vanished (test_scope's testClassAndGlobal and
! testClassNamespaceOverridesClosure).
!
! This is the snapshot with the writes CONNECTED.  Reads are unchanged -- the
! instance is seeded with the names bound so far, exactly as before -- and
! __setitem__ / __delitem__ additionally bind and unbind the class attribute,
! through ___classBodyDefinitionalStore___ / ___classBodyDefinitionalDelete___,
! the same two entry points a class-body ``if'' branch and a class-body loop
! already store through.  So a write reaches the prepared namespace (EnumDict,
! when there is one) on the same terms as any other class-body assignment.
!
! SEEDING must not write through, and does not: builtins
! ___buildClassBodyLocals___:forClass: fills the entries FIRST and binds the
! class afterwards, and with no class bound __setitem__ is the inherited dict
! store.  That ordering is the whole guard -- there is no separate seed path to
! keep in step.
!
! STILL A SNAPSHOT FOR READS, and this is the documented divergence: an instance
! held across statements does not grow as the body binds more names.
!
!     class C:
!         p = 1
!         d = locals()
!         q = 2
!         seen = list(d)      -- CPython ['__module__', ..., 'p', 'd', 'q']
!                             -- Grail    ['p']
!
! Closing that means executing class bodies into a real mapping rather than
! scanning them, which is a change to ClassDefAst; see
! docs/Class_Body_Namespace.md.
! ===============================================================================

! ------------------- Class definition for ClassBodyLocals
expectvalue /Class
doit
PyDict subclass: 'ClassBodyLocals'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ClassBodyLocals category: 'Grail-Python'
%

expectvalue /Metaclass3
doit
ClassBodyLocals removeAllMethods: 0.
ClassBodyLocals removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Class Namespace'
method: ClassBodyLocals
___grailBindClass___: aClass
	"Connect the writes, once the entries are seeded.  Until this runs every
	store is the inherited dict one, which is what lets the seeding reuse
	__setitem__ without binding a class attribute per seeded name.

	A dynamic instVar rather than a real slot: the receiver is rooted in a
	kernel collection, and PyDict's subclasses default their extra state this
	way (see EnumDict, whose every slot is lazy for the same reason)."

	self @env0:dynamicInstVarAt: #'_grail_class' put: aClass.
	^ self
%

category: 'Grail-Class Namespace'
method: ClassBodyLocals
___grailClass___
	"The class under construction, or nil while the instance is being seeded."

	^ self @env0:dynamicInstVarAt: #'_grail_class'
%

category: 'Grail-Python Protocol'
method: ClassBodyLocals
__setitem__: key _: value
	"``locals()['x'] = 43'' in a class body -- bind the class attribute, then
	record what was actually stored.

	The class store is FIRST so that a namespace entitled to refuse the write
	(enum.EnumDict on a reused member name) raises before this mapping records
	it, and so that a namespace that TRANSFORMS the value -- EnumDict resolving
	an auto() -- is what the mapping goes on to report.  That is the same
	read-back rule ___grailNsStore___ applies to an ordinary class-body
	assignment; a locals() write is not a second kind of write."

	| cls |
	cls := self ___grailClass___.
	cls @env0:isNil ifTrue: [^ super __setitem__: key _: value].
	^ super __setitem__: key
		_: (cls ___classBodyDefinitionalStore___: key @env0:asString put: value)
%

category: 'Grail-Python Protocol'
method: ClassBodyLocals
__delitem__: key
	"``del locals()['x']'' -- unbind the class attribute too.

	Raises out of the class delete when the name is not bound there, which is
	the NameError CPython's class-body delete raises; the mapping is left
	untouched in that case, since the inherited store below never runs."

	| cls |
	cls := self ___grailClass___.
	cls @env0:isNil ifFalse: [
		cls ___classBodyDefinitionalDelete___: key @env0:asString].
	^ super __delitem__: key
%

set compile_env: 0
