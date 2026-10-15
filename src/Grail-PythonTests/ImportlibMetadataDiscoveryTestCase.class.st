Class {
	#name : 'ImportlibMetadataDiscoveryTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ImportlibMetadataDiscoveryTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/importlib_metadata_discovery.py'

]

{ #category : 'Grail-Private' }
ImportlibMetadataDiscoveryTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ImportlibMetadataDiscoveryTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'importlib_metadata_discovery' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'importlib_metadata_discovery'.

]

{ #category : 'Grail-Setup' }
ImportlibMetadataDiscoveryTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'importlib_metadata_discovery' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ImportlibMetadataDiscoveryTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 22.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
ImportlibMetadataDiscoveryTestCase >> testVendoredDistributionsHaveTheirVersions [
	"Each distribution bundled in src/python/bundled has a dist-info there, so
	importlib.metadata.version answers its real version -- the stub answered
	'+grail' strings, and Flask's test client reads Werkzeug's for its
	User-Agent."

	| md |
	md := (builtins @env1:instance) @env1:___import__: { 'importlib.metadata' } kw: nil.
	md := md @env1:___pyAttrLoad___: #'metadata'.
	#( #('flask' '3.1.2') #('werkzeug' '3.1.5') #('jinja2' '3.1.6')
	   #('itsdangerous' '2.2.0') #('blinker' '1.9.0') #('markupsafe' '3.0.3') ) do: [:pair |
		self
			assert: ((md @env1:___pyAttrLoad___: #'version')
				@env1:___pyCallValue___: { pair at: 1 } kw: nil) asString
			equals: (pair at: 2)]

]
