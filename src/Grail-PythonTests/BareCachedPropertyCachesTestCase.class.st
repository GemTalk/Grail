Class {
	#name : 'BareCachedPropertyCachesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BareCachedPropertyCachesTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/bare_cached_property_caches.py'

]

{ #category : 'Grail-Private' }
BareCachedPropertyCachesTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
BareCachedPropertyCachesTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'bare_cached_property_caches' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'bare_cached_property_caches'.

]

{ #category : 'Grail-Setup' }
BareCachedPropertyCachesTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'bare_cached_property_caches' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
BareCachedPropertyCachesTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 12.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
BareCachedPropertyCachesTestCase >> testFlaskAndWerkzeugCache [
	| rows |
	rows := (testModule @env1:___pyAttrLoad___: #flask_rows)
		@env1:___pyCallValue___: #() kw: nil.
	self assert: (rows @env1:__len__) = 4.
	#('werkzeug cached_property caches'
	  'app.jinja_env is app.jinja_env'
	  'app.logger is app.logger'
	  'a filter and a global set on app.jinja_env render') do: [:label |
		self
			assert: (rows @env1:__getitem__: label) == true
			description: label]

]
