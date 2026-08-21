param(
  [Parameter(Mandatory=$true)][string]$BucketName,
  [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Stop"
Write-Host "Creating S3 learning website bucket $BucketName in $Region"

if ($Region -eq "us-east-1") {
  aws s3api create-bucket --bucket $BucketName --region $Region
} else {
  aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region
}

# S3 website endpoints are public HTTP endpoints. This is intentionally learning-only.
aws s3api put-public-access-block --bucket $BucketName --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
aws s3api put-bucket-website --bucket $BucketName --website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'

$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadForLearningWebsite",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BucketName/*"
  }]
}
"@
$temp = Join-Path $env:TEMP "quralyst-s3-policy.json"
$policy | Set-Content -Path $temp -Encoding ascii
aws s3api put-bucket-policy --bucket $BucketName --policy "file://$temp"
Remove-Item $temp -Force

Write-Host "Bucket created. In S3 > Properties > Static website hosting, copy the website endpoint."
Write-Warning "The S3 website endpoint is HTTP-only and the bucket is publicly readable. Delete it after practice or add CloudFront/OAC for a secure HTTPS design."
