Class {
	#name : 'GrailReprLookupSignaller',
	#superclass : 'Object',
	#instVars : [
		'signal'
	]
}

{ #category : 'Grail-Test-Support' }
GrailReprLookupSignaller class >> signalling: aBlock [
	^ self new setSignal: aBlock

]

{ #category : 'Grail-Test-Support' }
GrailReprLookupSignaller >> setSignal: aBlock [
	signal := aBlock

]
