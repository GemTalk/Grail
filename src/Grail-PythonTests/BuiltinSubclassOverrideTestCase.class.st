Class {
	#name : 'BuiltinSubclassOverrideTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-BuiltinSubclassOverride' }
BuiltinSubclassOverrideTestCase >> loadFixture [
	"Load tests/python/builtin_subclass_override.py fresh."

	importlib @env1:modules removeKey: #'builtin_subclass_override' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_subclass_override.py')
		name: 'builtin_subclass_override'

]

{ #category : 'Grail-Tests-BuiltinSubclassOverride' }
BuiltinSubclassOverrideTestCase >> testFrozensetPlainSubclassRejectsKwarg [
	"A plain frozenset subclass (neither __new__ nor __init__ overridden) still
	rejects keyword arguments -- the __new__-leniency relaxation must not leak to
	the default new/init pair (test_keywords_in_subclass: subclass(sequence=()))."

	self assert: self loadFixture @env1:frozenset_plain_subclass_rejects_kwarg equals: true

]

{ #category : 'Grail-Tests-BuiltinSubclassOverride' }
BuiltinSubclassOverrideTestCase >> testFrozensetSubclassInitAcceptsKwarg [
	"A frozenset subclass with its OWN __init__ consumes the keyword argument
	there (already worked; guards against a regression in the __new__-leniency
	change)."

	self assert: self loadFixture @env1:frozenset_subclass_init_accepts_kwarg equals: true

]

{ #category : 'Grail-Tests-BuiltinSubclassOverride' }
BuiltinSubclassOverrideTestCase >> testFrozensetSubclassNewAcceptsKwarg [
	"bpo-43413: a frozenset subclass that overrides __new__ may be constructed
	with a keyword argument (consumed by __new__), because frozenset inherits
	the lenient object.__init__.  Regresses test.test_set's frozenset
	test_keywords_in_subclass (subclass_with_new(arg, newarg=3)), which errored
	with ``frozenset() takes no keyword arguments'' before frozenset>>___init__:kw:
	was made lenient when the class overrides __new__."

	self assert: self loadFixture @env1:frozenset_subclass_new_accepts_kwarg equals: true

]

{ #category : 'Grail-Tests-BuiltinSubclassOverride' }
BuiltinSubclassOverrideTestCase >> testOverrideDefaultArgStillWorks [
	"The varargs override's own default-argument branch still works
	(missing key returns the supplied default)."

	self assert: self loadFixture @env1:override_default_arg_still_works equals: true

]

{ #category : 'Grail-Tests-BuiltinSubclassOverride' }
BuiltinSubclassOverrideTestCase >> testSetSubclassNewRejectsKwarg [
	"A set subclass with __new__ overridden STILL rejects a keyword argument:
	unlike frozenset, set has its own strict set.__init__ (test_keywords_in_subclass's
	set case expects the same call frozenset accepts to raise).  Guards against
	over-relaxing the fix to the mutable-set path."

	self assert: self loadFixture @env1:set_subclass_new_rejects_kwarg equals: true

]

{ #category : 'Grail-Tests-BuiltinSubclassOverride' }
BuiltinSubclassOverrideTestCase >> testVarargsOverrideBeatsInheritedBuiltin [
	"A varargs override (`get` with defaults) on a dict subclass wins
	over the inherited fixed-arity `dict.get` when invoked indirectly
	through BoundMethod."

	self assert: self loadFixture @env1:varargs_override_beats_inherited_builtin equals: true

]
