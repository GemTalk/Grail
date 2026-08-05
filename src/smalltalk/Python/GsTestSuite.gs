category: 'Accessing'
classmethod: GsTestSuite
logFilePath
  "allow multiple topaz -l / gem  to write to same directory"
  | path |
  path := './SUnit', System gemProcessId asString, '.log'.
  ^ path .
%

