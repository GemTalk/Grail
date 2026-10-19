Extension { #name : 'GsTestSuite' }

{ #category : 'Accessing' }
GsTestSuite class >> logFilePath [
  "allow multiple topaz -l / gem  to write to same directory"
  | path |
  path := './SUnit', System gemProcessId asString, '.log'.
  ^ path .

]
