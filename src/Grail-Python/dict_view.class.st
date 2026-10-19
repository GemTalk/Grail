Class {
	#name : 'dict_view',
	#superclass : 'object',
	#instVars : [
		'mapping'
	],
	#category : 'Grail-Collections'
}

{ #category : 'Grail-Python Attribute Hook' }
dict_view class >> ___pythonValueAttrs___ [
	"``view.mapping'' is a VALUE attribute (the read-only mappingproxy over
	the backing dict), not a callable -- without this ___pyAttrLoad___ wraps
	the accessor as a BoundMethod (test_dict test_views_mapping).  Inherited
	by dict_keys / dict_values / dict_items."

	^ IdentitySet @env0:new @env0:add: #'mapping'; yourself

]

{ #category : 'Grail-Compat' }
dict_view >> asArray [
	^ (self ___elements) asArray

]

{ #category : 'Grail-Compat' }
dict_view >> at: anIndex [
	^ (self ___elements) at: anIndex

]

{ #category : 'Grail-Compat' }
dict_view >> do: aBlock [
	(self ___elements) do: aBlock

]

{ #category : 'Grail-Compat' }
dict_view >> first [
	^ (self ___elements) first

]

{ #category : 'Grail-Compat' }
dict_view >> includes: anObject [
	^ (self ___elements) includes: anObject

]

{ #category : 'Grail-Compat' }
dict_view >> isEmpty [
	^ mapping isEmpty

]

{ #category : 'Grail-Compat' }
dict_view >> notEmpty [
	^ mapping isEmpty not

]

{ #category : 'Grail-Compat' }
dict_view >> size [
	^ mapping size

]
