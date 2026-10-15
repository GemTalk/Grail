Class {
	#name : 'SubmoduleAutoBindTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
SubmoduleAutoBindTestCase >> setUp [
	"Load the submodule and the package via direct loadModuleFromPath:.
	Ordering: _leaf first (gets registered as pkg_autobind._leaf and
	—after the fix— bound as the `_leaf` attribute on pkg_autobind);
	then __init__.py executes, whose body uses ``from . import _leaf``
	which resolves to pkg_autobind._leaf and finds it cached."

	| mods |
	mods := importlib @env1:modules.
	#( 'pkg_autobind' 'pkg_autobind._leaf' ) do: [:n |
		mods removeKey: n asSymbol ifAbsent: []].
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_autobind/_leaf.py')
		name: 'pkg_autobind._leaf'.
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_autobind/__init__.py')
		name: 'pkg_autobind'.

]

{ #category : 'Grail-Tests - Submodule auto-bind' }
SubmoduleAutoBindTestCase >> testInitRanWithLeafAvailable [
	"__init__.py's ``from . import _leaf`` + ``leaf_value = _leaf.VALUE``
	executed successfully because the leaf attribute was present."

	self assert: (testModule @env1:leaf_value) equals: 'leaf-loaded'.

]

{ #category : 'Grail-Tests - Submodule auto-bind' }
SubmoduleAutoBindTestCase >> testLeafBoundOnPackageBeforeInitRuns [
	"After loading pkg_autobind._leaf directly, the leaf is reachable
	via attribute access on the package — required for
	``from . import _leaf`` inside __init__.py to bind anything."

	self assert: (testModule @env1:_leaf) notNil.

]
