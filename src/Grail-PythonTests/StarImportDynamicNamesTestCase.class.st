Class {
	#name : 'StarImportDynamicNamesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
StarImportDynamicNamesTestCase >> setUp [

	| mods |
	mods := importlib @env1:modules.
	#( 'pkg_star_dyn' 'pkg_star_dyn._source' 'pkg_star_dyn._consumer' ) do: [:n |
		mods removeKey: n asSymbol ifAbsent: []].
	"Load package, source, then consumer."
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_star_dyn/__init__.py')
		name: 'pkg_star_dyn'.
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_star_dyn/_source.py')
		name: 'pkg_star_dyn._source'.
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_star_dyn/_consumer.py')
		name: 'pkg_star_dyn._consumer'.

]

{ #category : 'Grail-Tests - Star import dynamics' }
StarImportDynamicNamesTestCase >> testDynamicNamesReadFromStarImport [
	"Names added to the source's namespace at module-init time via
	`globals().update(...)` (the re._constants `_makecodes` pattern)
	must also come across the star import.  Parse-time expansion
	can't see these; only a runtime merge step picks them up."

	self assert: (testModule @env1:dyn_a_value) equals: 0.
	self assert: (testModule @env1:dyn_b_value) equals: 1.
	self assert: (testModule @env1:dyn_c_value) equals: 2.

]

{ #category : 'Grail-Tests - Star import dynamics' }
StarImportDynamicNamesTestCase >> testReturnedListReachable [
	"The function's RETURN value (CODES, statically declared as the
	target of an assignment) crosses the star import — proves the
	static-expansion path still works alongside the runtime merge."

	self assert: (testModule @env1:codes_count) equals: 3.

]

{ #category : 'Grail-Tests - Star import statics' }
StarImportDynamicNamesTestCase >> testStaticNamesReadFromStarImport [
	"Names declared with simple `NAME = value` in the source module
	come across the star import via parse-time expansion (the path
	that already worked)."

	self assert: (testModule @env1:static_x_value) equals: 'static-x'.
	self assert: (testModule @env1:static_y_value) equals: 'static-y'.

]
