Class {
	#name : 'mappingproxy',
	#superclass : 'object',
	#instVars : [
		'mapping'
	],
	#category : 'Grail-Collections'
}

{ #category : 'Grail-Compat' }
mappingproxy >> at: aKey [
	^ mapping at: aKey

]

{ #category : 'Grail-Compat' }
mappingproxy >> includesKey: aKey [
	^ mapping includesKey: aKey

]

{ #category : 'Grail-Compat' }
mappingproxy >> keysAndValuesDo: aBlock [
	mapping keysAndValuesDo: aBlock

]

{ #category : 'Grail-Compat' }
mappingproxy >> size [
	^ mapping size

]
