Class {
	#name : 'GrailForwarderTarget',
	#superclass : 'Object'
}

{ #category : 'Grail-Forwarder-Target' }
GrailForwarderTarget class >> beacon [
	^ 'beacon'

]

{ #category : 'Grail-Forwarder-Target' }
GrailForwarderTarget class >> triple: n [
	^ n * 3

]

{ #category : 'Grail-Forwarder-Target' }
GrailForwarderTarget >> bump: n [
	^ n + 1

]

{ #category : 'Grail-Forwarder-Target' }
GrailForwarderTarget >> combine: a with: b [
	^ a + b

]

{ #category : 'Grail-Forwarder-Target' }
GrailForwarderTarget >> giveNil [
	"Answers Smalltalk nil so the forwarder's nil -> None coercion can be
	exercised."
	^ nil

]

{ #category : 'Grail-Forwarder-Target' }
GrailForwarderTarget >> pong [
	^ 'pong'

]
