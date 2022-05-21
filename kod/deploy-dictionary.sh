#!/bin/sh

sumname=$(shasum ../data/job.json | cut -d ' ' -f 1)
filename=${sumname}".json"
cp ../data/job.json $filename
echo "const dictionary_file_name = \""$filename"\";" > current-data.js

