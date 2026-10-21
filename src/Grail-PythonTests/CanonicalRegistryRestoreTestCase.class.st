"importlib class >> ___canonicalRegistryRestore___: takes back what was
added since its snapshot and nothing else (#1731).

A class registered under a key the snapshot already had is a re-mint: the
registry keeps it, so the canonical-class set has to keep it too.  The
restore used to drop it from the set, and every later runtime store on it
went to the committed class instead of the session overlay."
Class {
	#name : 'CanonicalRegistryRestoreTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'standing',
		'remint'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CanonicalRegistryRestoreTestCase >> moduleName [

	^ 'grail_registry_restore'

]

{ #category : 'Grail-Setup' }
CanonicalRegistryRestoreTestCase >> setUp [

	standing := self eval: 'type("Standing", (), {})'.
	remint := self eval: 'type("Standing", (), {})'.
	importlib ___canonicalClassRegister___: self moduleName name: 'Standing' value: standing

]

{ #category : 'Grail-Setup' }
CanonicalRegistryRestoreTestCase >> tearDown [

	importlib ___forgetCanonicalModule___: self moduleName.
	(UserGlobals at: #'GrailCanonicalClassSet' otherwise: nil) ifNotNil: [:canonicalClasses |
		canonicalClasses removeAll:
			((Array with: standing with: remint) select: [:each | canonicalClasses includes: each])]

]

{ #category : 'Grail-Tests' }
CanonicalRegistryRestoreTestCase >> testAClassAddedAfterTheSnapshotIsNotCanonicalAfterTheRestore [

	| snapshot |

	snapshot := importlib ___canonicalRegistrySnapshot___.
	importlib ___canonicalClassRegister___: self moduleName name: 'Added' value: remint.
	importlib ___canonicalRegistryRestore___: snapshot.
	self deny: (importlib ___canonicalClassKnown___: remint)

]

{ #category : 'Grail-Tests' }
CanonicalRegistryRestoreTestCase >> testAClassRemintedUnderAKeyOfTheSnapshotStaysCanonicalAfterTheRestore [

	| snapshot |

	snapshot := importlib ___canonicalRegistrySnapshot___.
	importlib ___canonicalClassRegister___: self moduleName name: 'Standing' value: remint.
	importlib ___canonicalRegistryRestore___: snapshot.
	self assert: (importlib ___canonicalClassKnown___: remint)

]
