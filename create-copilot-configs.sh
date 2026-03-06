#!/bin/bash

# 批量创建 copilot.json 配置文件
BASE_DIR="D:/sources/idea_projects/tjyhy"

# 定义服务配置（格式：目录名|仓库名|质效地址）
declare -A services=(
  ["TJCM-AiGenerateContent"]="TJCM-AiGenerateContent.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=2e66a42b7177d7ed1cc4d15a54211761"
  ["tjcm-enterprise"]="tjcm-enterprise.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=f9b036486b9e807c9e3a824868ff2a62"
  ["tjcm-ws-gateway"]="tjcm-ws-gateway.git|"
  ["tjcm-iflytek-bridge"]="tjcm-iflytek-bridge.git|"
  ["tjcm-log"]="tjcm-log.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=9d5cc8af4ca354d18d0f0e1fc35d7f89"
  ["tjcm-mall"]="tjcm-mall.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=53be9917a45e6b881ebdc99fe477b3b5"
  ["tjcm-management"]="tjcm-management.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=8bcaca7c-1785-44e6-9821-c2b7ff458115"
  ["tjcm-meeting"]="tjcm-meeting.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=2dd8d137-b235-4636-bc8f-1f723abdff1d"
  ["TJCM-Observer"]="TJCM-Observer.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=700c26129b7c890ec75acf167cd3f534"
  ["tjcm-realtime-comm"]="tjcm-realtime-comm.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=885d72a8-17af-4891-ab9f-a945ea8c32c2"
  ["tjcm-summary"]="tjcm-summary.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=9e42de0241599c3738d436fc667f5f00"
  ["tjcm-survey"]="tjcm-survey.git|"
  ["tjcm-task"]="tjcm-task.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=ee601c7a-111c-42ea-86d8-f6f6cf783509"
  ["tjcm-thirdparty-adapter"]="tjcm-thirdparty-adapter.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=63788d8a552ae8a67b6326beb0721833"
  ["tjcm-user"]="tjcm-user.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=250036f6-bc16-4a6d-b501-3bc78e266b64"
  ["tjcm-webhook"]="tjcm-webhook.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=ff6c6998dd85c8b4da0e1b9b0ec10eba"
  ["tjcm-cloudspaceadapter-pcclient"]="tjcm-cloudspaceadapter-pcclient.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=2fce54f1-ac39-4c00-a0de-655e968a016a&appId=c0c4f8048f583dd304b7891cbb5064c6"
  ["whiteboard-cooperate"]="whiteboard-cooperate.git|"
  ["whiteboard-share"]="whiteboard-share.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=d08db602471a8441999613eb0e4d0f66&appId=9c016e223d6b649def48a92576dba529"
  ["tjzhp-intelligentOperation"]="tjzhp-intelligentOperation.git|http://console.devops.iflytek.com/ipipeline/applicationPipeline?projectId=d08db602471a8441999613eb0e4d0f66&appId=e36c7ad552476292a20473735b8aea7b"
)

# 遍历所有服务
for dir_name in "${!services[@]}"; do
  service_dir="$BASE_DIR/$dir_name"

  # 检查目录是否存在
  if [ ! -d "$service_dir" ]; then
    echo "⚠️  目录不存在，跳过: $dir_name"
    continue
  fi

  # 解析配置
  IFS='|' read -r repo_name ipipeline_url <<< "${services[$dir_name]}"

  # 去掉 .git 后缀
  repo_name_clean="${repo_name%.git}"

  # 构建 code 地址
  code_url="https://code.iflytek.com/osc/_source/CBG_tjzqyhypub/${repo_name_clean}/-/code/"

  # 创建 copilot.json
  config_file="$service_dir/copilot.json"

  echo "📝 创建配置: $dir_name"

  # 生成 JSON 内容
  if [ -n "$ipipeline_url" ]; then
    # 有质效地址
    cat > "$config_file" << EOF
{
  "version": "1.0",
  "links": [
    {
      "name": "代码仓库",
      "url": "$code_url"
    },
    {
      "name": "构建流水线",
      "url": "$ipipeline_url"
    }
  ]
}
EOF
  else
    # 没有质效地址
    cat > "$config_file" << EOF
{
  "version": "1.0",
  "links": [
    {
      "name": "代码仓库",
      "url": "$code_url"
    }
  ]
}
EOF
  fi

  echo "✅ 已创建: $config_file"
done

echo ""
echo "🎉 批量创建完成！"
