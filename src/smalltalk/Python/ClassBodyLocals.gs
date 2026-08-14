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

category: 'Grail-Python Protocol'
method: ClassBodyLocals
update: other
	"``vars().update({...})'' in a class body -- bind a class attribute per
	entry, not just a mapping entry.

	dict's own mutators store with ``at:put:'' rather than through
	__setitem__, which is right for a dict (CPython's dict.update does not call
	a subclass's __setitem__ either) but wrong HERE: CPython's class-body
	vars()/locals() IS the namespace, so mutating it by any route reaches the
	class.  Grail's is a connected snapshot, so the connection has to be made
	per mutator.  Subscript assignment already went through __setitem__ and
	worked; ``.update()'' silently dropped every entry (test_enum's
	test_dynamic_members_with_static_methods, which defines its members that
	way).

	The argument shapes -- mapping, keys+__getitem__ protocol, iterable of
	pairs -- and their error messages are dict's, reused by merging into a
	scratch dict first and replaying THAT through __setitem__.  Replaying
	preserves insertion order, which the enum case needs: a later duplicate has
	to reach EnumDict to be refused."

	| scratch |
	self ___grailClass___ @env0:isNil ifTrue: [^ super update: other].
	scratch := dict ___new___.
	scratch update: other.
	scratch @env0:keysAndValuesDo: [:k :v | self __setitem__: k _: v].
	^ None
%

category: 'Grail-Python Protocol'
method: ClassBodyLocals
_update: positional kw: kwargs
	"``vars().update(mapping, **kwargs)'' -- the varargs form.  Same reason as
	update:, and the keyword half needs its own routing because dict's stores
	the kwargs with at:put: directly rather than delegating.

	The positional is merged FIRST, then the keywords, which is the order that
	makes ``update({'FOO_CAT': 'aloof'}, **{'FOO_CAT': 'small'})'' raise
	EnumDict's ``'FOO_CAT' already defined as 'aloof''' rather than quietly
	taking the last value."

	| cls |
	cls := self ___grailClass___.
	cls @env0:isNil ifTrue: [^ super _update: positional kw: kwargs].
	positional @env0:isEmpty ifFalse: [self update: (positional @env0:at: 1)].
	(kwargs @env0:isNil not and: [kwargs @env0:isEmpty not]) ifTrue: [
		kwargs @env0:keysAndValuesDo: [:key :value |
			(key @env0:isKindOf: CharacterCollection) ifFalse: [
				TypeError ___signal___: 'keywords must be strings'].
			self __setitem__: key @env0:asString _: value]].
	^ None
%

category: 'Grail-Python Protocol'
method: ClassBodyLocals
setdefault: key _: default
	"``vars().setdefault(name, x)'' -- an insertion, so it binds the class
	attribute like any other.  An already-present key is answered untouched, so
	no store happens and the class is not disturbed."

	self ___grailClass___ @env0:isNil ifTrue: [^ super setdefault: key _: default].
	(self @env0:includesKey: key) ifTrue: [^ self @env0:at: key].
	^ self __setitem__: key _: default
%

category: 'Grail-Python Protocol'
method: ClassBodyLocals
pop: key _: default
	"``vars().pop(name)'' -- a removal, so it unbinds the class attribute.
	Routed through __delitem__ for that; the value is read before the delete
	because the delete is what makes it unreadable."

	| absent value |
	self ___grailClass___ @env0:isNil ifTrue: [^ super pop: key _: default].
	absent := self ___absentMarker___.
	value := self get: key _: absent.
	value == absent ifTrue: [^ default].
	self __delitem__: key.
	^ value
%

category: 'Grail-Python Protocol'
method: ClassBodyLocals
pop: key
	"One-argument pop -- KeyError when absent, exactly as dict's does."

	| absent value |
	absent := self ___absentMarker___.
	value := self pop: key _: absent.
	value == absent ifTrue: [
		key ___requireHashableAsDictKey___.
		KeyError ___signal___: key].
	^ value
%

category: 'Grail-Python Protocol'
method: ClassBodyLocals
popitem
	"``vars().popitem()'' -- a removal, so it unbinds the class attribute too."

	| pair |
	self ___grailClass___ @env0:isNil ifTrue: [^ super popitem].
	pair := super popitem.
	"super already removed the mapping entry; unbind the class side to match."
	self ___grailClass___
		___classBodyDefinitionalDelete___: (pair @env0:at: 1) @env0:asString.
	^ pair
%

category: 'Grail-Python Protocol'
method: ClassBodyLocals
clear
	"``vars().clear()'' -- unbind every name the mapping holds, then empty it."

	| keys |
	self ___grailClass___ @env0:isNil ifTrue: [^ super clear].
	keys := OrderedCollection @env0:new.
	self @env0:keysDo: [:k | keys @env0:add: k].
	keys @env0:do: [:k | self __delitem__: k].
	^ None
%

set compile_env: 0
