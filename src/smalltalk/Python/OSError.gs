! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- OSError (needs instance variables, so create as Python class)
expectvalue /Class
doit
Exception subclass: 'OSError'
  instVarNames: #( errno strerror filename filename2 )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
OSError comment:
'Python OSError exception.

Instance variables:
  errno - error number
  strerror - error message string
  filename - name of the file involved (if any)
  filename2 - second filename (for operations involving two files)
'
%

expectvalue /Class
doit
OSError category: 'Exceptions'
%
