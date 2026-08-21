param(
  [Parameter(Mandatory=$true)][string]$BucketName
)
$ErrorActionPreference = "Stop"
Write-Host "Removing all objects from $BucketName"
aws s3 rm "s3://$BucketName" --recursive
Write-Host "Deleting bucket $BucketName"
aws s3api delete-bucket --bucket $BucketName
Write-Host "Website bucket deleted. Also delete the CodePipeline, CodeBuild project, CodeConnections connection, IAM roles/policies, and pipeline artifact bucket from the AWS console if you created them."
