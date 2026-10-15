Class {
	#name : 'RuntimeClassCreationTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-helpers' }
RuntimeClassCreationTestCase >> loadFixture: shortName [
	"Drop any cached registration for `shortName` then load
	tests/python/<shortName>.py fresh.  Returns the module instance."

	| mods path |
	mods := importlib @env1:modules.
	mods removeKey: shortName asSymbol ifAbsent: [].
	path := importlib grailDir , '/tests/python/' , shortName , '.py'.
	^importlib loadModuleFromPath: path name: shortName

]

{ #category : 'Grail-Tests - (e) Name Collision' }
RuntimeClassCreationTestCase >> testCollisionBothModulesIsolated [
	"Loading module B after module A must not corrupt module A's
	`Shared` class — each module's instance answers its own value."

	| modA modB instA instB |
	modA := self loadFixture: 'runtime_class_collision_a'.
	modB := self loadFixture: 'runtime_class_collision_b'.
	instA := modA dynamicInstVarAt: #inst.
	instB := modB dynamicInstVarAt: #inst.
	self assert: (instA perform: #kind env: 1) equals: 'A'.
	self assert: (instB perform: #kind env: 1) equals: 'B'.
	self deny: instA class == instB class.

]

{ #category : 'Grail-Tests - (e) Name Collision' }
RuntimeClassCreationTestCase >> testCollisionModuleAIsolated [
	"Module A's `Shared` class returns 'A'."

	| modA |
	modA := self loadFixture: 'runtime_class_collision_a'.
	self assert: (modA @env1:result) equals: 'A'.

]

{ #category : 'Grail-Tests - (c) Conditional' }
RuntimeClassCreationTestCase >> testConditionalTakesTrueBranch [
	"With flag=True the true-branch class definition runs;
	Cond().kind() should return 'true_branch'."

	| mod |
	mod := self loadFixture: 'runtime_class_conditional'.
	self assert: (mod @env1:result) equals: 'true_branch'.

]

{ #category : 'Grail-Tests - (d) Factory' }
RuntimeClassCreationTestCase >> testFactoryClassesWork [
	"Both factory-produced classes should be instantiable and have
	a working kind() method."

	| mod |
	mod := self loadFixture: 'runtime_class_factory'.
	self assert: (mod @env1:a_kind) equals: 'inner'.
	self assert: (mod @env1:b_kind) equals: 'inner'.

]

{ #category : 'Grail-Tests - (d) Factory' }
RuntimeClassCreationTestCase >> testFactoryProducesDistinctClasses [
	"Two calls to make_class() must return distinct class objects
	(A is B should be False)."

	| mod |
	mod := self loadFixture: 'runtime_class_factory'.
	self assert: (mod @env1:same) equals: false.

]

{ #category : 'Grail-Tests - (g) Inheritance' }
RuntimeClassCreationTestCase >> testInheritedMethod [
	"Dog inherits kind() from Animal."

	| mod |
	mod := self loadFixture: 'runtime_class_inheritance'.
	self assert: (mod @env1:a_kind) equals: 'animal'.
	self assert: (mod @env1:d_kind) equals: 'animal'.

]

{ #category : 'Grail-Tests - (f) Global Reference' }
RuntimeClassCreationTestCase >> testMethodReadsModuleGlobal [
	"An instance method that reads a bare name not declared in any
	enclosing local scope should resolve it to the defining module's
	global (the module instance's instVar of that name in Grail)."

	| mod |
	mod := self loadFixture: 'runtime_class_global_ref'.
	self assert: (mod @env1:result) equals: 'hello'.

]

{ #category : 'Grail-Tests - (g) Inheritance' }
RuntimeClassCreationTestCase >> testOwnMethodOnSubclass [
	"Dog adds its own bark() method."

	| mod |
	mod := self loadFixture: 'runtime_class_inheritance'.
	self assert: (mod @env1:d_bark) equals: 'woof'.

]

{ #category : 'Grail-Tests - (b) Re-definition' }
RuntimeClassCreationTestCase >> testRedefPreservesEarlierInstance [
	"After `class Bar:` is re-defined, the instance built from the
	first definition should still answer 1 from foo()."

	| mod |
	mod := self loadFixture: 'runtime_class_redef'.
	self assert: (mod @env1:r1_pre) equals: 1.
	self assert: (mod @env1:r1_post) equals: 1.

]

{ #category : 'Grail-Tests - (b) Re-definition' }
RuntimeClassCreationTestCase >> testRedefProducesDistinctClasses [
	"The two `class Bar:` statements must produce distinct class
	objects (bar1's class != bar2's class)."

	| mod bar1 bar2 |
	mod := self loadFixture: 'runtime_class_redef'.
	bar1 := mod dynamicInstVarAt: #bar1.
	bar2 := mod dynamicInstVarAt: #bar2.
	self deny: bar1 class == bar2 class.

]

{ #category : 'Grail-Tests - (b) Re-definition' }
RuntimeClassCreationTestCase >> testRedefSecondInstanceUsesSecondDefinition [
	"The instance built after the re-definition should answer 2."

	| mod |
	mod := self loadFixture: 'runtime_class_redef'.
	self assert: (mod @env1:r2) equals: 2.

]
