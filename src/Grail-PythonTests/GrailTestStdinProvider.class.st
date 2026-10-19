Class {
	#name : 'GrailTestStdinProvider',
	#superclass : 'Object',
	#instVars : [
		'lines',
		'prompts'
	]
}

{ #category : 'Grail-Test-Support' }
GrailTestStdinProvider class >> lines: aCollection [
	^ self new setLines: aCollection

]

{ #category : 'Grail-Test-Support' }
GrailTestStdinProvider >> nextLinePrompt: aPrompt [
	prompts add: aPrompt.
	lines isEmpty ifTrue: [^ nil].
	^ lines removeFirst

]

{ #category : 'Grail-Test-Support' }
GrailTestStdinProvider >> prompts [
	^ prompts

]

{ #category : 'Grail-Test-Support' }
GrailTestStdinProvider >> setLines: aCollection [
	lines := OrderedCollection withAll: aCollection.
	prompts := OrderedCollection new

]
