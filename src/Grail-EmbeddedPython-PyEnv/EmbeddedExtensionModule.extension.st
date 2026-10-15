Extension { #name : 'EmbeddedExtensionModule' }

{ #category : 'Grail-Attribute Access' }
EmbeddedExtensionModule >> ___pyAttrLoad___: attributeName [

	^ CPythonObjectForwarder @env0:replicateAttribute: attributeName of: cpythonModule

]
