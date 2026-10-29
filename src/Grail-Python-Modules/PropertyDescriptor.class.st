Class {
	#name : 'PropertyDescriptor',
	#superclass : 'AbstractPropertyDescriptor',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instantiation' }
PropertyDescriptor class >> ___checkConstructorArguments___: positional keywords: keywords [
	"property(fget=None, fset=None, fdel=None, doc=None) refuses what that
	signature does not admit.  The varargs constructor read the four it knew
	and dropped the rest, so ``property(x=1)'' and a fifth positional were
	both accepted."

	TypeError
		___argumentsOf___: positional
		keywords: keywords
		named: #('fget' 'fset' 'fdel' 'doc')
		positionalOnly: 0
		required: 0
		for: 'property'

]

{ #category : 'Grail-Attribute Access' }
PropertyDescriptor class >> ___grailReadonlyAttributes___ [
	"property's members -- not DynamicClassAttribute's, which shares this
	implementation but whose attributes are ordinary ones in CPython.  See
	Object class >> ___grailReadonlyAttributes___."

	^ #('fget' 'fset' 'fdel')

]

{ #category : 'Grail-Attribute Access' }
PropertyDescriptor class >> ___grailUnwritableAttributes___ [
	"property's __isabstractmethod__ getter, not DynamicClassAttribute's -- see
	PropertyDescriptor class >> ___grailReadonlyAttributes___."

	^ #('__isabstractmethod__')

]

{ #category : 'Grail-Attribute Access' }
PropertyDescriptor class >> ___grailUnwritableOwnerName___ [

	^ 'property'

]
