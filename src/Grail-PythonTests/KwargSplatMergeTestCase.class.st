Class {
	#name : 'KwargSplatMergeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-KwargSplat' }
KwargSplatMergeTestCase >> loadFixture [
	"Load tests/python/kwarg_splat_merge.py fresh."

	importlib @env1:modules removeKey: #'kwarg_splat_merge' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/kwarg_splat_merge.py')
		name: 'kwarg_splat_merge'

]

{ #category : 'Grail-Tests-KwargSplat' }
KwargSplatMergeTestCase >> testClassNamedAndSplat [
	"``Recorder('rule', methods=['GET'], **{'endpoint':'hello','x':1})`` —
	the flask ``Rule(...)`` shape against a class constructor (legacy
	``value:value:`` dispatch path).  ``endpoint`` must bind from the splat
	and the genuinely-extra ``x`` must reach ``**extra``."

	| r |
	r := self loadFixture @env1:class_named_and_splat.
	self assert: (r @env1:__getitem__: 0) equals: 'rule'.
	self assert: (r @env1:__getitem__: 1) size equals: 1.
	self assert: (r @env1:__getitem__: 2) equals: 'hello'.
	self assert: (r @env1:__getitem__: 3) equals: true

]

{ #category : 'Grail-Tests-KwargSplat' }
KwargSplatMergeTestCase >> testFuncNamedAndSplat [
	"Same shape against a plain function (varargs ``_name:kw:`` path)."

	| r |
	r := self loadFixture @env1:func_named_and_splat.
	self assert: (r @env1:__getitem__: 0) equals: 'rule'.
	self assert: (r @env1:__getitem__: 2) equals: 'hello'.
	self assert: (r @env1:__getitem__: 3) equals: true

]

{ #category : 'Grail-Tests-KwargSplat' }
KwargSplatMergeTestCase >> testSplatOnly [
	"A lone ``**splat`` (no explicit kwargs) must still pass through."

	| r |
	r := self loadFixture @env1:splat_only.
	self assert: (r @env1:__getitem__: 0) equals: 'rule'.
	self assert: (r @env1:__getitem__: 1) size equals: 1.
	self assert: (r @env1:__getitem__: 2) equals: 'hello'.
	self assert: (r @env1:__getitem__: 3) equals: true

]
